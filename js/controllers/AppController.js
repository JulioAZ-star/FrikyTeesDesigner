import { EventBus } from "../core/EventBus.js";
import { NodeSerializer } from "../core/NodeSerializer.js";
import { CanvasManager } from "../managers/CanvasManager.js";
import { SelectionManager } from "../managers/SelectionManager.js";
import { TextManager } from "../managers/TextManager.js";
import { ImageManager } from "../managers/ImageManager.js";
import { HistoryManager } from "../managers/HistoryManager.js";
import { ProductManager } from "../managers/ProductManager.js";
import { UIManager } from "../managers/UIManager.js";
import { Config } from "../config/Config.js";

export class AppController {
  constructor(productCatalog) {
    this.saveHandle = null;
    this.adminMode = false;
    this.clientMode = false;
    this.isSpacePanning = false;
    this.wixBridge = {
      targetOrigin: "*"
    };
    this.copiedNodeSnapshot = null;
    this.eventBus = new EventBus();
    this.canvasManager = new CanvasManager();
    this.selectionManager = new SelectionManager(this.canvasManager, this.eventBus);
    this.textManager = new TextManager(this.canvasManager, this.selectionManager);
    this.imageManager = new ImageManager(this.canvasManager, this.selectionManager);
    this.productManager = new ProductManager(productCatalog);
    this.uiManager = new UIManager(this.eventBus);

    this.historyManager = new HistoryManager({
      onBuildSnapshot: () => this.#buildSnapshot(),
      onApplySnapshot: (snapshot) => this.#applySnapshot(snapshot)
    });

    this.currentView = "front";
    this.isApplyingHistory = false;
    this.isCalibrationMode = false;
  }

  async init() {
    await this.#restoreSaveHandle();
    this.#initializeRuntimeContext();
    this.#bindHostBridge();
    this.canvasManager.init();
    this.canvasManager.setPrintAreaChangeListener((bounds) => this.#handlePrintAreaChange(bounds));
    this.selectionManager.init();
    this.productManager.initialize();
    this.uiManager.setCalibrationAccess(false);
    this.uiManager.closeAdminAccessModal();

    this.uiManager.bind({
      onAddText: () => this.#createText(),
      onRequestImage: (fileInput) => this.imageManager.requestImageSelection(fileInput),
      onImageFileSelected: async (file) => this.#createImage(file),
      onProductChange: async (productId) => this.#setProduct(productId),
      onColorChange: async (color) => this.#setColor(color),
      onSizeChange: (size) => this.#setSize(size),
      onViewChange: async (view) => this.#setView(view),
      onUndo: async () => this.#undo(),
      onRedo: async () => this.#redo(),
      onResetZoom: () => this.canvasManager.resetViewport(),
      onDuplicate: async () => this.#duplicateSelected(),
      onBringFront: () => this.#bringSelectedToFront(),
      onSendBack: () => this.#sendSelectedToBack(),
      onToggleLock: () => this.#toggleSelectedLock(),
      onCenterHorizontally: () => this.#centerSelectedHorizontally(),
      onCenterVertically: () => this.#centerSelectedVertically(),
      onDelete: () => this.#deleteSelected(),
      onAddToCart: () => this.#emitAddToCart(),
      onNodePropertyChange: (property, value) => this.#updateSelectedNodeProperty(property, value),
      onOpenAdminAccess: () => this.#openAdminAccess(),
      onSubmitAdminPassword: (password) => this.#submitAdminPassword(password),
      onToggleCalibration: () => this.#toggleCalibrationMode(),
      onExportCurrentProduct: () => this.#copyCurrentProductExport(),
      onSaveCatalog: () => this.#saveCatalogDirectly(),
      onDownloadCatalog: () => this.#downloadCatalog()
    });

    await this.#loadCurrentSurface({ resetHistory: false });
    this.#setClientMode(this.clientMode);

    this.#bindKeyboardShortcuts();

    this.historyManager.initialize();
    this.#syncHistoryUI();
  }

  #createText() {
    this.textManager.addDefaultText();
    this.#captureHistory();
  }

  async #createImage(file) {
    await this.imageManager.addImageFromFile(file);
    this.#captureHistory();
  }

  #deleteSelected() {
    const node = this.selectionManager.deleteSelected();

    if (node) {
      this.#captureHistory();
    }
  }

  async #duplicateSelected() {
    const selected = this.selectionManager.getSelectedNode();

    if (!selected) {
      return;
    }

    const snapshot = NodeSerializer.serialize(selected);

    if (!snapshot) {
      return;
    }

    const duplicated = await this.#createNodeFromSnapshot({
      ...snapshot,
      id: this.#nextNodeId(snapshot.type),
      x: snapshot.x + 18,
      y: snapshot.y + 18
    });

    if (!duplicated) {
      return;
    }

    this.selectionManager.select(duplicated);
    this.#captureHistory();
  }

  #bringSelectedToFront() {
    const selected = this.selectionManager.getSelectedNode();

    if (!selected) {
      return;
    }

    this.canvasManager.bringNodeToFront(selected);
    this.selectionManager.select(selected);
    this.#captureHistory();
  }

  #sendSelectedToBack() {
    const selected = this.selectionManager.getSelectedNode();

    if (!selected) {
      return;
    }

    this.canvasManager.sendNodeToBack(selected);
    this.selectionManager.select(selected);
    this.#captureHistory();
  }

  #toggleSelectedLock() {
    const selected = this.selectionManager.getSelectedNode();

    if (!selected) {
      return;
    }

    const nextLocked = !this.selectionManager.isLocked(selected);

    this.selectionManager.setLocked(selected, nextLocked);
    this.#captureHistory();
  }

  #centerSelectedHorizontally() {
    const selected = this.selectionManager.getSelectedNode();

    if (!selected) {
      return;
    }

    this.canvasManager.alignNodeHorizontally(selected, "center");
    this.selectionManager.select(selected);
    this.#captureHistory();
  }

  #centerSelectedVertically() {
    const selected = this.selectionManager.getSelectedNode();

    if (!selected) {
      return;
    }

    this.canvasManager.alignNodeVertically(selected, "center");
    this.selectionManager.select(selected);
    this.#captureHistory();
  }

  #copySelected() {
    const selected = this.selectionManager.getSelectedNode();

    if (!selected) {
      return;
    }

    this.copiedNodeSnapshot = NodeSerializer.serialize(selected);
  }

  async #pasteCopied() {
    if (!this.copiedNodeSnapshot) {
      return;
    }

    const pastedSnapshot = JSON.parse(JSON.stringify(this.copiedNodeSnapshot));

    pastedSnapshot.id = this.#nextNodeId(pastedSnapshot.type);
    pastedSnapshot.x += 22;
    pastedSnapshot.y += 22;

    const pastedNode = await this.#createNodeFromSnapshot(pastedSnapshot);

    if (!pastedNode) {
      return;
    }

    this.selectionManager.select(pastedNode);
    this.#captureHistory();
  }

  async #setProduct(productId) {
    this.#saveCurrentSurfaceDesign();
    this.productManager.setProduct(productId);
    await this.#loadCurrentSurface({ resetHistory: true });
  }

  async #setColor(color) {
    const surface = this.productManager.setColor(color);

    if (!surface) {
      return;
    }

    await this.canvasManager.setProductSurface(surface);
    this.#syncCatalogUI(surface);
  }

  #setSize(size) {
    const surface = this.productManager.setSize(size);

    if (!surface) {
      return;
    }

    this.#syncCatalogUI(surface);
  }

  async #setView(view) {
    this.#saveCurrentSurfaceDesign();
    this.productManager.setFace(view);
    await this.#loadCurrentSurface({ resetHistory: true });
  }

  #updateSelectedNodeProperty(property, value) {
    const selected = this.selectionManager.getSelectedNode();

    if (!selected) {
      return;
    }

    if (this.#updateSharedNodeProperty(selected, property, value)) {
      this.canvasManager.draw();
      this.eventBus.emit("selection:changed", selected);
      this.#captureHistory();
      return;
    }

    if (selected.className === "Text") {
      this.textManager.updateTextNode(selected, { [property]: value });
    }

    if (selected.className === "Image") {
      this.imageManager.updateImageNode(selected, { [property]: value });
    }

    const shouldRefreshProperties = ["fontStyleToggle", "align", "hAlign", "flipX", "flipY"].includes(property);

    if (shouldRefreshProperties) {
      this.eventBus.emit("selection:changed", selected);
    }

    this.#captureHistory();
  }

  async #undo() {
    await this.historyManager.undo();
    this.#syncHistoryUI();
  }

  async #redo() {
    await this.historyManager.redo();
    this.#syncHistoryUI();
  }

  #bindKeyboardShortcuts() {
    window.addEventListener("keydown", async (event) => {
      const target = event.target;
      const isTypingTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable;

      const isDelete = event.key === "Delete";
      const isUndo = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !event.shiftKey;
      const isRedo =
        ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") ||
        ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "z");
      const isCopy = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c";
      const isPaste = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v";
      const isResetZoom = (event.ctrlKey || event.metaKey) && event.key === "0";
      const isSpacePan = event.code === "Space";

      if (isSpacePan && !isTypingTarget) {
        event.preventDefault();
        this.#beginSpacePan();
        return;
      }

      if (isDelete && !isTypingTarget) {
        event.preventDefault();
        this.#deleteSelected();
      }

      if (isCopy && !isTypingTarget) {
        event.preventDefault();
        this.#copySelected();
      }

      if (isPaste && !isTypingTarget) {
        event.preventDefault();
        await this.#pasteCopied();
      }

      if (isResetZoom && !isTypingTarget) {
        event.preventDefault();
        this.canvasManager.resetViewport();
      }

      if (isUndo) {
        event.preventDefault();
        await this.#undo();
      }

      if (isRedo) {
        event.preventDefault();
        await this.#redo();
      }
    });

    const stage = this.canvasManager.getStage();

    stage.on("dragend transformend", (event) => {
      if (event.target === stage) {
        return;
      }

      this.#captureHistory();
    });

    window.addEventListener("keyup", (event) => {
      if (event.code === "Space") {
        this.#endSpacePan();
      }
    });

    window.addEventListener("blur", () => {
      this.#endSpacePan();
    });

  }

  #captureHistory() {
    if (this.isApplyingHistory) {
      return;
    }

    this.historyManager.capture();
    this.#syncHistoryUI();
  }

  #buildSnapshot() {
    return {
      nodes: NodeSerializer.serializeMany(this.canvasManager.getDesignNodes())
    };
  }

  #saveCurrentSurfaceDesign() {
    this.productManager.saveCurrentFaceDesign(NodeSerializer.serializeMany(this.canvasManager.getDesignNodes()));
  }

  async #loadCurrentSurface({ resetHistory }) {
    const surface = this.productManager.getSurfaceState();

    if (!surface) {
      return;
    }

    this.currentView = surface.face.id;
    await this.canvasManager.setProductSurface(surface);
    this.#syncCatalogUI(surface);
    await this.#applySnapshot({ nodes: surface.nodes });

    if (resetHistory) {
      this.historyManager.reset({ nodes: surface.nodes });
      this.#syncHistoryUI();
    }
  }

  #syncCatalogUI(surface = this.productManager.getSurfaceState()) {
    if (!surface) {
      return;
    }

    this.uiManager.renderCatalogState({
      products: this.productManager.getProducts(),
      currentProductId: surface.product.id,
      colors: surface.product.colors,
      currentColor: surface.color,
      sizes: surface.product.sizes,
      currentSize: surface.size,
      faces: surface.product.faces,
      currentFaceId: surface.face.id
    });

    this.uiManager.setView(surface.face.id);
    this.#syncCalibrationUI();
  }

  #toggleCalibrationMode() {
    if (!this.adminMode) {
      return;
    }

    this.isCalibrationMode = !this.isCalibrationMode;

    if (this.isCalibrationMode) {
      this.selectionManager.clearSelection();
    }

    this.canvasManager.enablePrintAreaCalibration(this.isCalibrationMode);
    this.#syncCalibrationUI();
  }

  #handlePrintAreaChange(bounds) {
    if (!bounds) {
      return;
    }

    if (this.isCalibrationMode) {
      this.productManager.updateCurrentFacePrintArea(bounds);
    }

    this.#syncCalibrationUI(bounds);
  }

  #openAdminAccess() {
    this.uiManager.openAdminAccessModal();
  }

  #submitAdminPassword(password) {
    if (password !== Config.security.adminPassword) {
      this.uiManager.setAdminAccessError("Contraseña incorrecta");
      return;
    }

    this.adminMode = true;
    this.uiManager.closeAdminAccessModal();
    this.uiManager.setCalibrationAccess(true);
    this.#syncCalibrationUI();
  }

  #syncCalibrationUI(bounds = this.canvasManager.getPrintAreaBounds()) {
    if (!this.adminMode) {
      this.uiManager.setCalibrationAccess(false);
      return;
    }

    const surface = this.productManager.getSurfaceState();

    this.uiManager.renderCalibrationState({
      enabled: this.isCalibrationMode,
      faceName: surface?.face?.name ?? "",
      bounds,
      currentProduct: this.productManager.getCurrentProductExport()
    });
  }

  async #copyCurrentProductExport() {
    const currentProduct = this.productManager.getCurrentProductExport();

    if (!currentProduct) {
      return;
    }

    const text = JSON.stringify(currentProduct, null, 2);

    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const fallback = document.createElement("textarea");
    fallback.value = text;
    fallback.setAttribute("readonly", "");
    fallback.style.position = "absolute";
    fallback.style.left = "-9999px";
    document.body.append(fallback);
    fallback.select();
    document.execCommand("copy");
    fallback.remove();
  }

  #downloadCatalog() {
    const catalog = this.productManager.exportCatalog();
    const json = JSON.stringify(catalog, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "products.json";
    link.click();

    URL.revokeObjectURL(url);
  }

  async #saveCatalogDirectly() {
    const catalog = this.productManager.exportCatalog();
    const json = JSON.stringify(catalog, null, 2);
    try {
      const handle = await this.#getWritableSaveHandle();

      if (handle) {
        const writable = await handle.createWritable();

        try {
          await writable.write(json);
        } finally {
          await writable.close();
        }

        this.saveHandle = handle;
        await this.#persistSaveHandle(handle);
        return;
      }

      if (!window.showSaveFilePicker) {
        this.#downloadCatalog();
        return;
      }

      const pickerHandle = await window.showSaveFilePicker({
        suggestedName: "products.json",
        types: [
          {
            description: "JSON",
            accept: {
              "application/json": [".json"]
            }
          }
        ]
      });

      const writable = await pickerHandle.createWritable();

      try {
        await writable.write(json);
      } finally {
        await writable.close();
      }

      this.saveHandle = pickerHandle;
      await this.#persistSaveHandle(pickerHandle);
    } catch {
      this.#downloadCatalog();
    }
  }

  async #getWritableSaveHandle() {
    const handle = this.saveHandle ?? await this.#restoreSaveHandle();

    if (!handle) {
      return null;
    }

    const permission = await this.#ensureFilePermission(handle);

    return permission ? handle : null;
  }

  async #ensureFilePermission(handle) {
    if (typeof handle.queryPermission !== "function") {
      return true;
    }

    const current = await handle.queryPermission({ mode: "readwrite" });

    if (current === "granted") {
      return true;
    }

    if (typeof handle.requestPermission !== "function") {
      return false;
    }

    return (await handle.requestPermission({ mode: "readwrite" })) === "granted";
  }

  async #restoreSaveHandle() {
    if (!window.indexedDB) {
      return null;
    }

    const db = await this.#openSaveHandleDb();

    if (!db) {
      return null;
    }

    return new Promise((resolve) => {
      const transaction = db.transaction("settings", "readonly");
      const store = transaction.objectStore("settings");
      const request = store.get("products-json-handle");

      request.onsuccess = () => {
        const handle = request.result ?? null;
        this.saveHandle = handle;
        resolve(handle);
      };

      request.onerror = () => resolve(null);
    });
  }

  async #persistSaveHandle(handle) {
    if (!window.indexedDB) {
      return;
    }

    const db = await this.#openSaveHandleDb();

    if (!db) {
      return;
    }

    return new Promise((resolve) => {
      const transaction = db.transaction("settings", "readwrite");
      const store = transaction.objectStore("settings");
      store.put(handle, "products-json-handle");
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
      transaction.onabort = () => resolve();
    });
  }

  async #openSaveHandleDb() {
    return new Promise((resolve) => {
      const request = window.indexedDB.open("frikytees-designer", 1);

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings");
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
  }

  async #applySnapshot(snapshot) {
    this.isApplyingHistory = true;

    this.selectionManager.clearSelection();
    this.canvasManager.clearDesignLayer();

    try {
      for (const item of snapshot.nodes) {
        await this.#createNodeFromSnapshot(item);
      }
    } finally {
      this.isApplyingHistory = false;
      this.canvasManager.draw();
    }
  }

  async #emitAddToCart() {
    const surface = this.productManager.getSurfaceState();

    if (!surface) {
      return;
    }

    const payload = {
      productId: surface.product.id,
      faceId: surface.face.id,
      color: surface.color,
      size: surface.size,
      design: NodeSerializer.serializeMany(this.canvasManager.getDesignNodes()),
      createdAt: new Date().toISOString()
    };

    window.dispatchEvent(new CustomEvent("frikytees:add-to-cart", { detail: payload }));
    await this.#tryHostAddToCart(payload);

    const targetOrigin = this.wixBridge.targetOrigin || "*";

    window.parent?.postMessage({
      source: "frikytees-designer",
      type: "frikytees:add-to-cart",
      payload
    }, targetOrigin);

    window.parent?.postMessage({
      source: "frikytees-designer",
      type: "wix:addToCart",
      payload
    }, targetOrigin);
  }

  #initializeRuntimeContext() {
    const params = new URLSearchParams(window.location.search);
    const mode = (params.get("mode") ?? "").toLowerCase();
    const clientModeFlag = params.get("clientMode");
    const targetOrigin = params.get("wixTargetOrigin");

    if (mode === "client") {
      this.clientMode = true;
    }

    if (clientModeFlag === "1" || clientModeFlag === "true") {
      this.clientMode = true;
    }

    if (targetOrigin) {
      this.wixBridge.targetOrigin = targetOrigin;
    }
  }

  #bindHostBridge() {
    window.addEventListener("message", (event) => {
      const { data } = event;

      if (!data || typeof data !== "object") {
        return;
      }

      if (data.type === "frikytees:wix-context") {
        const targetOrigin = data.payload?.targetOrigin;

        if (typeof targetOrigin === "string" && targetOrigin.trim()) {
          this.wixBridge.targetOrigin = targetOrigin;
        }

        return;
      }

      if (data.type === "frikytees:set-client-mode") {
        this.#setClientMode(Boolean(data.payload?.enabled ?? data.enabled));
      }
    });
  }

  #setClientMode(enabled) {
    this.clientMode = Boolean(enabled);
    this.selectionManager.setClientMode(this.clientMode);
    this.uiManager.setClientMode(this.clientMode);
  }

  #beginSpacePan() {
    if (this.isSpacePanning) {
      return;
    }

    this.isSpacePanning = true;
    this.selectionManager.setInteractionPaused(true);
    this.canvasManager.setPanEnabled(true);
  }

  #endSpacePan() {
    if (!this.isSpacePanning) {
      return;
    }

    this.isSpacePanning = false;
    this.canvasManager.setPanEnabled(false);
    this.selectionManager.setInteractionPaused(false);
  }

  async #tryHostAddToCart(payload) {
    const customHandler = window.FrikyTeesWix?.addToCart ?? window.frikyteesAddToCart;

    if (typeof customHandler === "function") {
      await customHandler(payload);
    }
  }

  #updateSharedNodeProperty(node, property, value) {
    const nextValue = Number(value);

    if (property === "x" && !Number.isNaN(nextValue)) {
      node.x(nextValue);

      if (node.className !== "Image") {
        this.canvasManager.clampNodeToPrintArea(node);
      }

      return true;
    }

    if (property === "y" && !Number.isNaN(nextValue)) {
      node.y(nextValue);

      if (node.className !== "Image") {
        this.canvasManager.clampNodeToPrintArea(node);
      }

      return true;
    }

    if (property === "rotation" && !Number.isNaN(nextValue)) {
      node.rotation(nextValue);

      if (node.className !== "Image") {
        this.canvasManager.clampNodeToPrintArea(node);
      }

      return true;
    }

    if (property === "width" && !Number.isNaN(nextValue) && nextValue > 0) {
      this.#setNodeDimension(node, "width", nextValue);
      return true;
    }

    if (property === "height" && !Number.isNaN(nextValue) && nextValue > 0) {
      this.#setNodeDimension(node, "height", nextValue);
      return true;
    }

    return false;
  }

  #setNodeDimension(node, dimension, value) {
    if (dimension === "width") {
      const base = Math.max(1, node.width());
      const sign = node.scaleX() < 0 ? -1 : 1;

      node.scaleX((value / base) * sign);
    }

    if (dimension === "height") {
      const base = Math.max(1, node.height());
      const sign = node.scaleY() < 0 ? -1 : 1;

      node.scaleY((value / base) * sign);
    }

    if (node.className !== "Image") {
      this.canvasManager.clampNodeToPrintArea(node);
    }
  }

  async #createNodeFromSnapshot(item) {
    if (!item) {
      return null;
    }

    if (item.type === "text") {
      const textNode = this.textManager.createFromSnapshot(item);

      this.canvasManager.addNode(textNode);
      return textNode;
    }

    if (item.type === "image") {
      const imageNode = await this.imageManager.createFromSnapshot(item);

      this.canvasManager.addNode(imageNode);
      return imageNode;
    }

    return null;
  }

  #nextNodeId(type) {
    const prefix = type === "image" ? "image" : "text";

    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  #syncHistoryUI() {
    this.uiManager.setHistoryState({
      canUndo: this.historyManager.canUndo(),
      canRedo: this.historyManager.canRedo()
    });
  }
}

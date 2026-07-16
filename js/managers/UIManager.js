import { Config } from "../config/Config.js";

export class UIManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.elements = {
      addText: document.getElementById("addText"),
      addImage: document.getElementById("addImage"),
      imageLoader: document.getElementById("imageLoader"),
      product: document.getElementById("product"),
      size: document.getElementById("size"),
      productColorSection: document.getElementById("productColorSection"),
      productColors: document.getElementById("productColors"),
      faceViews: document.getElementById("faceViews"),
      undoBtn: document.getElementById("undoBtn"),
      redoBtn: document.getElementById("redoBtn"),
      resetZoomBtn: document.getElementById("resetZoomBtn"),
      duplicateBtn: document.getElementById("duplicateBtn"),
      bringFrontBtn: document.getElementById("bringFrontBtn"),
      sendBackBtn: document.getElementById("sendBackBtn"),
      lockBtn: document.getElementById("lockBtn"),
      centerHBtn: document.getElementById("centerHBtn"),
      centerVBtn: document.getElementById("centerVBtn"),
      deleteBtn: document.getElementById("deleteBtn"),
      addCart: document.getElementById("addCart"),
      orderSummary: document.getElementById("orderSummary"),
      properties: document.getElementById("properties"),
      toolsTitle: document.getElementById("toolsTitle"),
      adminAccessBtn: document.getElementById("adminAccessBtn"),
      calibrationSection: document.getElementById("calibrationSection"),
      adminModal: document.getElementById("adminModal"),
      adminPasswordInput: document.getElementById("adminPasswordInput"),
      adminModalError: document.getElementById("adminModalError"),
      adminCancelBtn: document.getElementById("adminCancelBtn"),
      adminSubmitBtn: document.getElementById("adminSubmitBtn"),
      toggleCalibration: document.getElementById("toggleCalibration"),
      calibrationPanel: document.getElementById("calibrationPanel"),
      calibrationContext: document.getElementById("calibrationContext"),
      printAreaX: document.getElementById("printAreaX"),
      printAreaY: document.getElementById("printAreaY"),
      printAreaWidth: document.getElementById("printAreaWidth"),
      printAreaHeight: document.getElementById("printAreaHeight"),
      printAreaSnippet: document.getElementById("printAreaSnippet"),
      copyPrintAreaSnippet: document.getElementById("copyPrintAreaSnippet"),
      saveProductsJson: document.getElementById("saveProductsJson"),
      downloadProductsJson: document.getElementById("downloadProductsJson")
    };
  }

  bind({
    onAddText,
    onRequestImage,
    onImageFileSelected,
    onProductChange,
    onColorChange,
    onSizeChange,
    onViewChange,
    onUndo,
    onRedo,
    onResetZoom,
    onDuplicate,
    onBringFront,
    onSendBack,
    onToggleLock,
    onCenterHorizontally,
    onCenterVertically,
    onDelete,
    onAddToCart,
    onNodePropertyChange,
    onOpenAdminAccess,
    onSubmitAdminPassword,
    onToggleCalibration,
    onExportCurrentProduct,
    onSaveCatalog,
    onDownloadCatalog
  }) {
    this.elements.addText.addEventListener("click", onAddText);

    this.elements.addImage.addEventListener("click", () => {
      onRequestImage(this.elements.imageLoader);
    });

    this.elements.imageLoader.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";

      if (file) {
        onImageFileSelected(file);
      }
    });

    this.elements.product.addEventListener("change", (event) => {
      onProductChange(event.target.value);
    });

    this.elements.size.addEventListener("change", (event) => {
      onSizeChange(event.target.value);
    });

    this.elements.productColors.addEventListener("click", (event) => {
      if (!(event.target instanceof HTMLElement)) {
        return;
      }

      const button = event.target.closest("button[data-color]");

      if (!(button instanceof HTMLButtonElement)) {
        return;
      }

      onColorChange(button.dataset.color);
    });

    this.elements.faceViews.addEventListener("click", (event) => {
      if (!(event.target instanceof HTMLElement)) {
        return;
      }

      const button = event.target.closest("button[data-face]");

      if (!(button instanceof HTMLButtonElement)) {
        return;
      }

      onViewChange(button.dataset.face);
    });

    this.elements.undoBtn.addEventListener("click", onUndo);
    this.elements.redoBtn.addEventListener("click", onRedo);
    this.elements.resetZoomBtn.addEventListener("click", onResetZoom);
    this.elements.duplicateBtn.addEventListener("click", onDuplicate);
    this.elements.bringFrontBtn.addEventListener("click", onBringFront);
    this.elements.sendBackBtn.addEventListener("click", onSendBack);
    this.elements.lockBtn.addEventListener("click", onToggleLock);
    this.elements.centerHBtn.addEventListener("click", onCenterHorizontally);
    this.elements.centerVBtn.addEventListener("click", onCenterVertically);
    this.elements.deleteBtn.addEventListener("click", onDelete);
    this.elements.addCart.addEventListener("click", onAddToCart);
    this.elements.adminAccessBtn.addEventListener("click", () => {
      this.openAdminAccessModal();
      onOpenAdminAccess?.();
    });
    this.elements.toolsTitle.addEventListener("dblclick", () => {
      this.openAdminAccessModal();
      onOpenAdminAccess?.();
    });
    this.elements.adminCancelBtn.addEventListener("click", () => {
      this.closeAdminAccessModal();
    });
    this.elements.adminSubmitBtn.addEventListener("click", () => {
      onSubmitAdminPassword(this.elements.adminPasswordInput.value);
    });
    this.elements.adminPasswordInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        onSubmitAdminPassword(this.elements.adminPasswordInput.value);
      }

      if (event.key === "Escape") {
        this.closeAdminAccessModal();
      }
    });
    this.elements.toggleCalibration.addEventListener("click", () => {
      onToggleCalibration();
    });
    this.elements.copyPrintAreaSnippet.addEventListener("click", async () => {
      await onExportCurrentProduct();
    });
    this.elements.saveProductsJson.addEventListener("click", onSaveCatalog);
    this.elements.downloadProductsJson.addEventListener("click", onDownloadCatalog);

    this.elements.properties.addEventListener("input", (event) => {
      const target = event.target;

      if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) {
        return;
      }

      if (!target.dataset.property) {
        return;
      }

      onNodePropertyChange(target.dataset.property, this.#readValue(target));
    });

    this.elements.properties.addEventListener("change", (event) => {
      const target = event.target;

      if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) {
        return;
      }

      if (!target.dataset.property) {
        return;
      }

      onNodePropertyChange(target.dataset.property, this.#readValue(target));
    });

    this.elements.properties.addEventListener("click", (event) => {
      const target = event.target;

      if (!(target instanceof HTMLElement)) {
        return;
      }

      const button = target.closest("button[data-property]");

      if (!(button instanceof HTMLButtonElement)) {
        return;
      }

      const property = button.dataset.property;

      if (!property) {
        return;
      }

      const value = button.dataset.value ?? true;
      onNodePropertyChange(property, value);
    });

    this.eventBus.on("selection:changed", (node) => {
      this.renderProperties(node);
      this.setSelectionActionsState(node);
    });
  }

  setSelectionActionsState(node) {
    const hasNode = Boolean(node);
    const locked = hasNode ? Boolean(node.getAttr("locked")) : false;

    this.elements.duplicateBtn.disabled = !hasNode;
    this.elements.bringFrontBtn.disabled = !hasNode;
    this.elements.sendBackBtn.disabled = !hasNode;
    this.elements.lockBtn.disabled = !hasNode;
    this.elements.centerHBtn.disabled = !hasNode;
    this.elements.centerVBtn.disabled = !hasNode;
    this.elements.deleteBtn.disabled = !hasNode;
    this.elements.lockBtn.textContent = locked ? "Desbloquear" : "Bloquear";
  }

  openAdminAccessModal() {
    this.elements.adminModal.hidden = false;
    this.elements.adminModalError.hidden = true;
    this.elements.adminPasswordInput.value = "";
    this.elements.adminPasswordInput.focus();
  }

  closeAdminAccessModal() {
    this.elements.adminModal.hidden = true;
    this.elements.adminModalError.hidden = true;
    this.elements.adminPasswordInput.value = "";
    this.elements.adminPasswordInput.blur();
  }

  setAdminAccessError(message) {
    this.elements.adminModalError.textContent = message;
    this.elements.adminModalError.hidden = false;
  }

  setCalibrationAccess(enabled) {
    this.elements.calibrationSection.hidden = !enabled;

    if (!enabled) {
      this.elements.calibrationPanel.hidden = true;
      this.elements.toggleCalibration.disabled = true;
      this.elements.copyPrintAreaSnippet.disabled = true;
      this.elements.saveProductsJson.disabled = true;
      this.elements.downloadProductsJson.disabled = true;
      return;
    }

    this.elements.toggleCalibration.disabled = false;
    this.elements.saveProductsJson.disabled = false;
    this.elements.downloadProductsJson.disabled = false;
  }

  renderCalibrationState({ enabled, faceName, bounds, currentProduct }) {
    this.elements.calibrationPanel.hidden = !enabled;
    this.elements.toggleCalibration.classList.toggle("active", enabled);
    this.elements.toggleCalibration.textContent = enabled
      ? "Salir de calibracion"
      : "Ajustar zona de impresion";

    if (!bounds) {
      this.elements.calibrationContext.textContent = "Ajustando zona de impresion";
      this.elements.printAreaX.value = "";
      this.elements.printAreaY.value = "";
      this.elements.printAreaWidth.value = "";
      this.elements.printAreaHeight.value = "";
      this.elements.printAreaSnippet.value = "";
      this.elements.copyPrintAreaSnippet.disabled = true;
      return;
    }

    this.elements.calibrationContext.textContent = faceName
      ? `Ajustando: ${faceName}`
      : "Ajustando zona de impresion";

    this.elements.printAreaX.value = String(bounds.x);
    this.elements.printAreaY.value = String(bounds.y);
    this.elements.printAreaWidth.value = String(bounds.width);
    this.elements.printAreaHeight.value = String(bounds.height);
    this.elements.printAreaSnippet.value = currentProduct
      ? JSON.stringify(currentProduct, null, 2)
      : JSON.stringify({
        printArea: {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height
        }
      }, null, 2);
    this.elements.copyPrintAreaSnippet.disabled = false;
  }

  renderCatalogState({ products, currentProductId, colors, currentColor, sizes, currentSize, faces, currentFaceId, customizedFaces = {} }) {
    const hasConfigurableColors = colors.length > 0;

    this.elements.product.innerHTML = products
      .map((product) => `<option value="${product.id}" ${product.id === currentProductId ? "selected" : ""} ${product.disabled ? "disabled" : ""}>${product.name}</option>`)
      .join("");

    this.elements.productColorSection.hidden = !hasConfigurableColors;

    this.elements.productColors.innerHTML = hasConfigurableColors
      ? colors
        .map((color) => `
          <button
            class="btn ${color.value === currentColor ? "active" : ""}"
            data-color="${color.value}"
            type="button"
          >${color.name}</button>
        `)
        .join("")
      : "";

    this.elements.size.innerHTML = sizes
      .map((size) => `<option value="${size}" ${size === currentSize ? "selected" : ""}>${size}</option>`)
      .join("");

    this.elements.faceViews.innerHTML = faces
      .map((face) => `
        <button
          class="btn ${face.id === currentFaceId ? "active" : ""}"
          data-face="${face.id}"
          type="button"
        >${face.name}<span class="face-status ${customizedFaces[face.id] ? "face-status-on" : "face-status-off"}">${customizedFaces[face.id] ? "✅" : "❌"}</span></button>
      `)
      .join("");
  }

  renderOrderSummary({ productName, colorName, size, frontCustomized, backCustomized, total, pricingTierLabel = "" }) {
    const tierRow = pricingTierLabel
      ? `<div class="summary-badge">${this.#escape(pricingTierLabel)}</div>`
      : "";

    this.elements.orderSummary.innerHTML = `
      <div class="summary-title">Resumen del pedido</div>
      ${tierRow}
      <div class="summary-row"><span class="summary-label">Producto</span><span>${this.#escape(productName)}</span></div>
      <div class="summary-row"><span class="summary-label">Color</span><span>${this.#escape(colorName)}</span></div>
      <div class="summary-row"><span class="summary-label">Talla</span><span>${this.#escape(size)}</span></div>
      <div class="summary-row"><span class="summary-label">Frontal</span><span>${frontCustomized ? "✅" : "❌"}</span></div>
      <div class="summary-row"><span class="summary-label">Espalda</span><span>${backCustomized ? "✅" : "❌"}</span></div>
      <div class="summary-row summary-total"><span class="summary-label">Total</span><span>${this.#formatPrice(total)}</span></div>
    `;

    this.elements.orderSummary.hidden = false;
  }

  renderOrderSummaryUnavailable({ productName }) {
    this.elements.orderSummary.innerHTML = `
      <div class="summary-title">Resumen del pedido</div>
      <div class="summary-unavailable">${this.#escape(productName)} no esta disponible para pedido en esta version.</div>
    `;

    this.elements.orderSummary.hidden = false;
  }

  setOrderSummaryVisibility(visible) {
    this.elements.orderSummary.hidden = !visible;
  }

  setAddToCartState({ total, enabled, unavailable = false }) {
    this.elements.addCart.textContent = unavailable
      ? "Añadir al carrito · No disponible"
      : `Añadir al carrito · ${this.#formatPrice(total)}`;
    this.elements.addCart.disabled = !enabled;
  }

  renderProperties(node) {
    if (!node) {
      this.elements.properties.innerHTML = "<p class=\"empty\">Selecciona un objeto</p>";
      return;
    }

    if (node.className === "Text") {
      const fontStyle = typeof node.fontStyle === "function" ? node.fontStyle() : "normal";
      const isBold = fontStyle.includes("bold");
      const isItalic = fontStyle.includes("italic");
      const objectAlign = this.#resolveHorizontalAlignment(node);
      const size = this.#getNodeVisualSize(node);

      this.elements.properties.innerHTML = `
        <div class="properties-grid">
          <label class="prop-label">Texto</label>
          <textarea data-property="text" rows="3">${this.#escape(node.text())}</textarea>

          <label class="prop-label">Fuente</label>
          <select data-property="fontFamily">
            ${this.#fontOptions(node.fontFamily())}
          </select>

          <div class="prop-row-two">
            <div>
              <label class="prop-label">Tamano</label>
              <input data-property="fontSize" type="number" min="8" max="220" value="${Math.round(node.fontSize())}" />
            </div>
            <div>
              <label class="prop-label">Color</label>
              <input data-property="fill" type="color" value="${node.fill()}" />
            </div>
          </div>

          <label class="prop-label">Estilo</label>
          <div class="prop-button-row">
            <button class="btn btn-mini ${isBold ? "active" : ""}" data-property="fontStyleToggle" data-value="bold" type="button">Negrita</button>
            <button class="btn btn-mini ${isItalic ? "active" : ""}" data-property="fontStyleToggle" data-value="italic" type="button">Cursiva</button>
          </div>

          <label class="prop-label">Transformacion</label>
          <div class="prop-row-two">
            <div>
              <label class="prop-label">X</label>
              <input data-property="x" type="number" step="1" value="${Math.round(node.x())}" />
            </div>
            <div>
              <label class="prop-label">Y</label>
              <input data-property="y" type="number" step="1" value="${Math.round(node.y())}" />
            </div>
            <div>
              <label class="prop-label">Width</label>
              <input data-property="width" type="number" min="1" step="1" value="${Math.round(size.width)}" />
            </div>
            <div>
              <label class="prop-label">Height</label>
              <input data-property="height" type="number" min="1" step="1" value="${Math.round(size.height)}" />
            </div>
            <div>
              <label class="prop-label">Rotacion</label>
              <input data-property="rotation" type="number" step="1" value="${Math.round(node.rotation())}" />
            </div>
          </div>

          <label class="prop-label">Alineacion objeto</label>
          <div class="prop-button-row">
            <button class="btn btn-mini ${objectAlign === "left" ? "active" : ""}" data-property="hAlign" data-value="left" type="button">Izquierda</button>
            <button class="btn btn-mini ${objectAlign === "center" ? "active" : ""}" data-property="hAlign" data-value="center" type="button">Centro</button>
            <button class="btn btn-mini ${objectAlign === "right" ? "active" : ""}" data-property="hAlign" data-value="right" type="button">Derecha</button>
          </div>
        </div>
      `;
      return;
    }

    const rotation = typeof node.rotation === "function" ? node.rotation() : 0;
    const scaleX = typeof node.scaleX === "function" ? node.scaleX() : 1;
    const scaleY = typeof node.scaleY === "function" ? node.scaleY() : 1;
    const objectAlign = this.#resolveHorizontalAlignment(node);
    const size = this.#getNodeVisualSize(node);

    this.elements.properties.innerHTML = `
      <div class="properties-grid">
        <div class="prop-row-two">
          <div>
            <label class="prop-label">Rotacion</label>
            <input data-property="rotation" type="number" step="1" value="${Math.round(rotation)}" />
          </div>
          <div>
            <label class="prop-label">X</label>
            <input data-property="x" type="number" step="1" value="${Math.round(node.x())}" />
          </div>
          <div>
            <label class="prop-label">Y</label>
            <input data-property="y" type="number" step="1" value="${Math.round(node.y())}" />
          </div>
          <div>
            <label class="prop-label">Width</label>
            <input data-property="width" type="number" min="1" step="1" value="${Math.round(size.width)}" />
          </div>
          <div>
            <label class="prop-label">Height</label>
            <input data-property="height" type="number" min="1" step="1" value="${Math.round(size.height)}" />
          </div>
        </div>

        <label class="prop-label">Volteo</label>
        <div class="prop-button-row">
          <button class="btn btn-mini ${scaleX < 0 ? "active" : ""}" data-property="flipX" data-value="toggle" type="button">Horizontal</button>
          <button class="btn btn-mini ${scaleY < 0 ? "active" : ""}" data-property="flipY" data-value="toggle" type="button">Vertical</button>
        </div>

        <label class="prop-label">Alineacion objeto</label>
        <div class="prop-button-row">
          <button class="btn btn-mini ${objectAlign === "left" ? "active" : ""}" data-property="hAlign" data-value="left" type="button">Izquierda</button>
          <button class="btn btn-mini ${objectAlign === "center" ? "active" : ""}" data-property="hAlign" data-value="center" type="button">Centro</button>
          <button class="btn btn-mini ${objectAlign === "right" ? "active" : ""}" data-property="hAlign" data-value="right" type="button">Derecha</button>
        </div>
      </div>
    `;
  }

  setView(view) {
    for (const button of this.elements.faceViews.querySelectorAll("button[data-face]")) {
      button.classList.toggle("active", button.dataset.face === view);
    }
  }

  setFaceCustomizationState(customizedFaces = {}) {
    for (const button of this.elements.faceViews.querySelectorAll("button[data-face]")) {
      const faceId = button.dataset.face;
      const customized = Boolean(customizedFaces[faceId]);
      const indicator = button.querySelector(".face-status");

      if (!indicator) {
        continue;
      }

      indicator.textContent = customized ? "✅" : "❌";
      indicator.classList.toggle("face-status-on", customized);
      indicator.classList.toggle("face-status-off", !customized);
    }
  }

  setHistoryState({ canUndo, canRedo }) {
    this.elements.undoBtn.disabled = !canUndo;
    this.elements.redoBtn.disabled = !canRedo;
  }

  setClientMode(enabled) {
    const hide = Boolean(enabled);

    this.elements.adminAccessBtn.classList.toggle("client-mode-hidden", hide);
    this.elements.calibrationSection.classList.toggle("client-mode-hidden", hide);
  }

  #escape(value) {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("\"", "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  #fontOptions(selectedFont) {
    const fonts = [
      "Arial",
      "Georgia",
      "Verdana",
      "Trebuchet MS",
      "Times New Roman",
      "Courier New"
    ];

    return fonts
      .map((font) => `<option value="${font}" ${font === selectedFont ? "selected" : ""}>${font}</option>`)
      .join("");
  }

  #readValue(target) {
    if (target instanceof HTMLInputElement && target.type === "number") {
      return Number(target.value);
    }

    if (target instanceof HTMLInputElement && target.type === "range") {
      return Number(target.value);
    }

    return target.value;
  }

  #formatPrice(value) {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR"
    }).format(Number(value || 0));
  }

  #resolveHorizontalAlignment(node) {
    const layer = node.getLayer?.();
    const box = node.getClientRect({
      skipStroke: true,
      skipShadow: true,
      relativeTo: layer ?? undefined
    });
    const clip = typeof layer?.clip === "function" ? layer.clip() : null;
    const leftEdge = clip?.x ?? Config.printArea.x;
    const rightEdge = (clip?.x ?? Config.printArea.x) + (clip?.width ?? Config.printArea.width);
    const centerEdge = leftEdge + (clip?.width ?? Config.printArea.width) / 2;
    const tolerance = 1;

    if (Math.abs(box.x - leftEdge) <= tolerance) {
      return "left";
    }

    if (Math.abs(box.x + box.width - rightEdge) <= tolerance) {
      return "right";
    }

    if (Math.abs(box.x + box.width / 2 - centerEdge) <= tolerance) {
      return "center";
    }

    return "";
  }

  #getNodeVisualSize(node) {
    const layer = node.getLayer?.();
    const box = node.getClientRect({
      skipStroke: true,
      skipShadow: true,
      relativeTo: layer ?? undefined
    });

    const width = Math.max(1, box.width);
    const height = Math.max(1, box.height);

    return { width, height };
  }

}

import { Config } from "../config/Config.js";

export class SelectionManager {
  constructor(canvasManager, eventBus) {
    this.canvasManager = canvasManager;
    this.eventBus = eventBus;
    this.transformer = null;
    this.activeDragNode = null;
    this.clientMode = false;
    this.interactionPaused = false;
  }

  init() {
    this.transformer = new Konva.Transformer({
      rotateEnabled: true,
      keepRatio: false,
      enabledAnchors: [
        "top-left",
        "top-right",
        "bottom-left",
        "bottom-right"
      ],
      borderStroke: "#1c63ff",
      anchorStroke: "#1c63ff",
      anchorFill: "#ffffff",
      anchorSize: 10,
      boundBoxFunc: (oldBox, newBox) => {
        const selected = this.getSelectedNode();
        const printArea = this.canvasManager.getPrintAreaBounds();

        if (newBox.width < Config.image.minSize || newBox.height < Config.image.minSize) {
          return oldBox;
        }

        if (selected?.className === "Image") {
          return newBox;
        }

        const fitsHorizontally =
          newBox.x >= printArea.x &&
          newBox.x + newBox.width <= printArea.x + printArea.width;

        const fitsVertically =
          newBox.y >= printArea.y &&
          newBox.y + newBox.height <= printArea.y + printArea.height;

        return fitsHorizontally && fitsVertically ? newBox : oldBox;
      }
    });

    this.canvasManager.getUILayer().add(this.transformer);

    const stage = this.canvasManager.getStage();
    const releaseDrag = () => {
      this.#releaseActiveDrag();
    };

    stage.on("pointerdown", (event) => {
      if (event.target === stage) {
        this.clearSelection();
      }
    });

    stage.on("mouseup pointerup touchend", releaseDrag);

    this.transformer.on("mouseup pointerup touchend", releaseDrag);

    this.transformer.on("dragstart", () => {
      const selected = this.getSelectedNode();

      if (selected) {
        this.activeDragNode = selected;
      }
    });

    this.transformer.on("dragmove", () => {
      if (this.activeDragNode) {
        if (this.activeDragNode.className !== "Image") {
          this.canvasManager.clampNodeToPrintArea(this.activeDragNode);
        }
        this.canvasManager.draw();
      }
    });

    this.transformer.on("dragend", releaseDrag);
  }

  attachNode(node) {
    node.on("click tap", () => {
      if (this.interactionPaused || this.#isNodeSelectionBlocked(node)) {
        return;
      }

      this.select(node);
    });

    node.on("dragstart", () => {
      if (this.interactionPaused || this.#isNodeSelectionBlocked(node)) {
        return;
      }

      this.activeDragNode = node;
      this.select(node);
    });

    node.on("dragmove", () => {
      if (node.className !== "Image") {
        this.canvasManager.clampNodeToPrintArea(node);
      }
      this.canvasManager.draw();
    });

    node.on("dragend", () => {
      this.#releaseActiveDrag();
    });

    node.on("transformstart", () => {
      if (this.interactionPaused || this.#isNodeSelectionBlocked(node)) {
        return;
      }

      this.select(node);
    });

    this.#syncNodeInteractivity(node);
  }

  select(node) {
    if (!node || (typeof node.isDestroyed === "function" && node.isDestroyed())) {
      return;
    }

    if (this.interactionPaused || this.#isNodeSelectionBlocked(node)) {
      return;
    }

    this.transformer.keepRatio(node.className === "Image");
    this.#syncTransformerState(node);
    this.transformer.nodes([node]);
    this.canvasManager.draw();
    this.eventBus.emit("selection:changed", node);
  }

  clearSelection() {
    this.transformer.keepRatio(false);
    this.transformer.nodes([]);
    this.canvasManager.draw();
    this.eventBus.emit("selection:changed", null);
  }

  getSelectedNode() {
    return this.transformer.nodes()[0] ?? null;
  }

  setClientMode(enabled) {
    this.clientMode = Boolean(enabled);

    for (const node of this.canvasManager.getDesignNodes()) {
      this.#syncNodeInteractivity(node);
    }

    const selected = this.getSelectedNode();

    if (selected && this.#isNodeSelectionBlocked(selected)) {
      this.clearSelection();
    }
  }

  setInteractionPaused(paused) {
    this.interactionPaused = Boolean(paused);

    if (this.interactionPaused) {
      this.clearSelection();
      return;
    }

    for (const node of this.canvasManager.getDesignNodes()) {
      this.#syncNodeInteractivity(node);
    }
  }

  isLocked(node = this.getSelectedNode()) {
    return Boolean(node?.getAttr("locked"));
  }

  setLocked(node, locked) {
    if (!node) {
      return;
    }

    const nextLocked = Boolean(locked);

    node.setAttr("locked", nextLocked);
    node.draggable(!nextLocked);
    this.#syncNodeInteractivity(node);

    if (node === this.getSelectedNode()) {
      this.#syncTransformerState(node);
      this.transformer.forceUpdate();
      this.eventBus.emit("selection:changed", node);
    }

    this.canvasManager.draw();
  }

  deleteSelected() {
    const selected = this.getSelectedNode();

    if (!selected) {
      return null;
    }

    selected.destroy();
    this.clearSelection();
    this.canvasManager.draw();
    return selected;
  }

  #releaseActiveDrag() {
    if (!this.activeDragNode) {
      return;
    }

    if (typeof this.activeDragNode.isDragging === "function" && this.activeDragNode.isDragging()) {
      this.activeDragNode.stopDrag();
    }

    this.activeDragNode = null;
    this.canvasManager.draw();
  }

  #syncTransformerState(node) {
    const locked = this.isLocked(node);

    this.transformer.rotateEnabled(!locked);
    this.transformer.resizeEnabled(!locked);
    this.transformer.enabledAnchors(
      locked
        ? []
        : [
          "top-left",
          "top-right",
          "bottom-left",
          "bottom-right"
        ]
    );
  }

  #isNodeSelectionBlocked(node) {
    return this.clientMode && this.isLocked(node);
  }

  #syncNodeInteractivity(node) {
    if (!node) {
      return;
    }

    const blocked = this.interactionPaused || this.#isNodeSelectionBlocked(node);

    node.draggable(!this.isLocked(node) && !this.interactionPaused);
    node.listening(!blocked);
  }
}

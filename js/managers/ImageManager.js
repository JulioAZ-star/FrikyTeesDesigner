import { Config } from "../config/Config.js";
import { DESIGN_NODE_NAME } from "../core/NodeSerializer.js";

export class ImageManager {
  constructor(canvasManager, selectionManager) {
    this.canvasManager = canvasManager;
    this.selectionManager = selectionManager;
    this.idCounter = 0;
  }

  requestImageSelection(fileInput) {
    fileInput.click();
  }

  async addImageFromFile(file) {
    if (!file) {
      return null;
    }

    const source = await this.#readFileAsDataUrl(file);
    return this.addImageFromSource(source);
  }

  async addImageFromSource(source) {
    const htmlImage = await this.#loadImage(source);

    const node = new Konva.Image({
      id: this.#nextId("image"),
      image: htmlImage,
      x: Config.image.x,
      y: Config.image.y,
      width: htmlImage.width,
      height: htmlImage.height,
      draggable: true,
      name: DESIGN_NODE_NAME,
      source
    });

    this.#limitNodeSize(node);
    this.#attachCommonEvents(node);

    this.canvasManager.addNode(node);
    this.canvasManager.centerNodeInPrintArea(node);
    this.selectionManager.attachNode(node);
    this.selectionManager.select(node);
    this.canvasManager.draw();

    return node;
  }

  async createFromSnapshot(data) {
    const htmlImage = await this.#loadImage(data.src);

    const node = new Konva.Image({
      id: data.id,
      image: htmlImage,
      x: data.x,
      y: data.y,
      width: data.width,
      height: data.height,
      scaleX: data.scaleX,
      scaleY: data.scaleY,
      rotation: data.rotation,
      opacity: data.opacity ?? 1,
      draggable: data.draggable,
      name: DESIGN_NODE_NAME,
      source: data.src
    });

    node.setAttr("locked", Boolean(data.locked));
    node.draggable(!data.locked && data.draggable !== false);

    this.#attachCommonEvents(node);
    this.selectionManager.attachNode(node);

    return node;
  }

  updateImageNode(node, { rotation, scale, hAlign, flipX, flipY }) {
    if (!node || node.className !== "Image") {
      return;
    }

    if (!Number.isNaN(Number(rotation))) {
      node.rotation(Number(rotation));
    }

    if (!Number.isNaN(Number(scale)) && Number(scale) > 0) {
      const nextScale = Number(scale);
      const signX = node.scaleX() < 0 ? -1 : 1;
      const signY = node.scaleY() < 0 ? -1 : 1;

      node.scaleX(nextScale * signX);
      node.scaleY(nextScale * signY);
    }

    if (typeof hAlign === "string" && ["left", "center", "right"].includes(hAlign)) {
      this.canvasManager.alignNodeHorizontally(node, hAlign);
    }

    if (flipX === "toggle") {
      const currentAbsX = Math.max(0.01, Math.abs(node.scaleX()));
      node.scaleX(node.scaleX() < 0 ? currentAbsX : -currentAbsX);
    }

    if (flipY === "toggle") {
      const currentAbsY = Math.max(0.01, Math.abs(node.scaleY()));
      node.scaleY(node.scaleY() < 0 ? currentAbsY : -currentAbsY);
    }
    this.canvasManager.draw();
  }

  #attachCommonEvents(node) {
    node.dragBoundFunc((position) => position);

    node.on("mouseenter", () => {
      this.canvasManager.getStage().container().style.cursor = Config.interaction.nodeHoverCursor;
    });

    node.on("mouseleave", () => {
      this.canvasManager.getStage().container().style.cursor = "default";
    });

    node.on("dragend", () => {
      this.canvasManager.draw();
    });

    node.on("transformend", () => {
      this.canvasManager.draw();
    });
  }

  #limitNodeSize(node) {
    const { maxSize } = Config.image;
    const printArea = this.canvasManager.getPrintAreaBounds();
    const maxWidth = Math.min(maxSize, printArea.width);
    const maxHeight = Math.min(maxSize, printArea.height);
    const widthRatio = maxWidth / node.width();
    const heightRatio = maxHeight / node.height();
    const ratio = Math.min(1, widthRatio, heightRatio);

    if (ratio >= 1) {
      return;
    }

    node.width(node.width() * ratio);
    node.height(node.height() * ratio);
  }

  #readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        resolve(event.target?.result ?? "");
      };

      reader.onerror = () => {
        reject(new Error("No se pudo leer la imagen"));
      };

      reader.readAsDataURL(file);
    });
  }

  #loadImage(source) {
    return new Promise((resolve, reject) => {
      const image = new Image();

      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("No se pudo cargar la imagen"));
      image.src = source;
    });
  }

  #nextId(prefix) {
    this.idCounter += 1;
    return `${prefix}-${Date.now()}-${this.idCounter}`;
  }
}

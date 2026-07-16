import { Config } from "../config/Config.js";

export class CanvasManager {
  constructor() {
    this.stage = null;
    this.productLayer = null;
    this.designLayer = null;
    this.overlayLayer = null;
    this.uiLayer = null;
    this.printAreaRect = null;
    this.productShape = null;
    this.mockupImage = null;
    this.hoodieLacesGroup = null;
    this.hoodieBackHoodGroup = null;
    this.hoodieBackHoodImage = null;
    this.mockupRequestId = 0;
    this.calibrationTransformer = null;
    this.isPrintAreaCalibrationEnabled = false;
    this.printAreaChangeListener = null;
    this.zoomMin = 0.5;
    this.zoomMax = 4;
    this.zoomFactor = 1.06;
    this.panEnabled = false;
    this.printAreaStyle = {
      stroke: Config.printArea.stroke,
      dash: Config.printArea.dash,
      strokeWidth: 2
    };
  }

  init() {
    this.stage = new Konva.Stage({
      container: Config.canvas.containerId,
      width: Config.canvas.width,
      height: Config.canvas.height
    });

    this.productLayer = new Konva.Layer();
    this.designLayer = new Konva.Layer();
    this.overlayLayer = new Konva.Layer();
    this.uiLayer = new Konva.Layer();

    this.stage.add(this.productLayer);
    this.stage.add(this.designLayer);
    this.stage.add(this.overlayLayer);
    this.stage.add(this.uiLayer);

    this.#buildProductBase();
    this.#buildPrintAreaCalibrationTools();
    this.#bindWheelZoom();
    this.applyDefaultViewport();
    requestAnimationFrame(() => {
      this.applyDefaultViewport();
    });
    this.draw();
  }

  #buildProductBase() {
    this.productShape = new Konva.Rect({
      x: 120,
      y: 70,
      width: 520,
      height: 700,
      cornerRadius: 30,
      fill: Config.product.defaultFill,
      stroke: Config.product.stroke,
      strokeWidth: 2,
      listening: false
    });

    this.mockupImage = new Konva.Image({
      x: 120,
      y: 70,
      width: 520,
      height: 700,
      listening: false,
      visible: false
    });

    this.printAreaRect = new Konva.Rect({
      x: Config.printArea.x,
      y: Config.printArea.y,
      width: Config.printArea.width,
      height: Config.printArea.height,
      stroke: Config.printArea.stroke,
      dash: Config.printArea.dash,
      strokeWidth: 2,
      draggable: false,
      fillEnabled: false,
      opacity: 1,
      listening: false
    });

    this.productLayer.add(this.productShape);
    this.productLayer.add(this.mockupImage);
    this.uiLayer.add(this.printAreaRect);

    this.hoodieLacesGroup = new Konva.Group({
      listening: false,
      visible: false
    });

    const leftLace = new Konva.Line({
      points: [0, 0, 0, 0],
      stroke: "#2f343b",
      strokeWidth: 5,
      lineCap: "round",
      lineJoin: "round",
      shadowColor: "rgba(0, 0, 0, 0.35)",
      shadowBlur: 2,
      shadowOffset: { x: 0, y: 1 }
    });

    const rightLace = new Konva.Line({
      points: [0, 0, 0, 0],
      stroke: "#2f343b",
      strokeWidth: 5,
      lineCap: "round",
      lineJoin: "round",
      shadowColor: "rgba(0, 0, 0, 0.35)",
      shadowBlur: 2,
      shadowOffset: { x: 0, y: 1 }
    });

    this.hoodieLacesGroup.add(leftLace);
    this.hoodieLacesGroup.add(rightLace);

    this.hoodieBackHoodGroup = new Konva.Group({
      x: 0,
      y: 0,
      listening: false,
      visible: false
    });

    this.hoodieBackHoodImage = new Konva.Image({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      listening: false
    });

    this.hoodieBackHoodGroup.add(this.hoodieBackHoodImage);

    this.overlayLayer.add(this.hoodieLacesGroup);
    this.overlayLayer.add(this.hoodieBackHoodGroup);
  }

  #buildPrintAreaCalibrationTools() {
    this.calibrationTransformer = new Konva.Transformer({
      rotateEnabled: false,
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
      visible: false,
      boundBoxFunc: (oldBox, newBox) => this.#constrainPrintAreaBox(oldBox, newBox)
    });

    this.uiLayer.add(this.calibrationTransformer);

    this.printAreaRect.on("dragmove", () => {
      this.#constrainPrintAreaToSurface();
      this.#notifyPrintAreaChange();
      this.draw();
    });

    this.printAreaRect.on("dragend", () => {
      this.#notifyPrintAreaChange();
      this.draw();
    });

    this.printAreaRect.on("transform", () => {
      this.#normalizePrintAreaScale();
      this.#constrainPrintAreaToSurface();
      this.calibrationTransformer.forceUpdate();
      this.#notifyPrintAreaChange();
      this.draw();
    });

    this.printAreaRect.on("transformend", () => {
      this.#normalizePrintAreaScale();
      this.#constrainPrintAreaToSurface();
      this.calibrationTransformer.forceUpdate();
      this.#notifyPrintAreaChange();
      this.draw();
    });
  }

  async setProductSurface({ product, face, color }) {
    const mockup = face.mockup ?? {};
    const printArea = face.printArea ?? {};
    const mockupSource = mockup.srcByColor?.[color] ?? mockup.src ?? null;
    const usesMockupImage = Boolean(mockupSource);

    this.productShape.setAttrs({
      x: mockup.x ?? 120,
      y: mockup.y ?? 70,
      width: mockup.width ?? 520,
      height: mockup.height ?? 700,
      cornerRadius: mockup.cornerRadius ?? 30,
      stroke: mockup.stroke ?? Config.product.stroke,
      fill: color ?? mockup.fill ?? Config.product.defaultFill,
      strokeWidth: mockup.strokeWidth ?? 2,
      visible: !usesMockupImage
    });

    this.mockupImage.setAttrs({
      x: mockup.x ?? 120,
      y: mockup.y ?? 70,
      width: mockup.width ?? 520,
      height: mockup.height ?? 700
    });

    this.printAreaStyle = {
      stroke: printArea.stroke ?? Config.printArea.stroke,
      dash: printArea.dash ?? Config.printArea.dash,
      strokeWidth: printArea.strokeWidth ?? 2
    };

    this.printAreaRect.setAttrs({
      x: printArea.x ?? Config.printArea.x,
      y: printArea.y ?? Config.printArea.y,
      width: printArea.width ?? Config.printArea.width,
      height: printArea.height ?? Config.printArea.height,
      stroke: this.printAreaStyle.stroke,
      dash: this.printAreaStyle.dash,
      strokeWidth: this.printAreaStyle.strokeWidth
    });

    this.#syncDesignLayerClip();

    this.#constrainPrintAreaToSurface();

    await this.#syncMockupOverlay({ ...mockup, src: mockupSource });
    this.#syncDetailOverlay({ product, face, mockup });

    if (this.isPrintAreaCalibrationEnabled) {
      this.#applyCalibrationVisualState();
      this.calibrationTransformer.nodes([this.printAreaRect]);
      this.calibrationTransformer.visible(true);
      this.calibrationTransformer.forceUpdate();
    }

    this.#notifyPrintAreaChange();

    this.draw();
  }

  setPrintAreaChangeListener(listener) {
    this.printAreaChangeListener = typeof listener === "function" ? listener : null;
  }

  enablePrintAreaCalibration(enabled) {
    this.isPrintAreaCalibrationEnabled = Boolean(enabled);

    this.printAreaRect.draggable(this.isPrintAreaCalibrationEnabled);
    this.printAreaRect.listening(this.isPrintAreaCalibrationEnabled);

    if (this.isPrintAreaCalibrationEnabled) {
      this.#applyCalibrationVisualState();
      this.calibrationTransformer.nodes([this.printAreaRect]);
      this.calibrationTransformer.visible(true);
      this.calibrationTransformer.forceUpdate();
    } else {
      this.calibrationTransformer.nodes([]);
      this.calibrationTransformer.visible(false);
      this.printAreaRect.setAttrs({
        stroke: this.printAreaStyle.stroke,
        dash: this.printAreaStyle.dash,
        strokeWidth: this.printAreaStyle.strokeWidth,
        fillEnabled: false,
        opacity: 1
      });
    }

    this.#notifyPrintAreaChange();
    this.draw();
  }

  addNode(node) {
    this.designLayer.add(node);
    this.draw();
  }

  removeNode(node) {
    node.destroy();
    this.draw();
  }

  getDesignNodes() {
    return this.designLayer.getChildren();
  }

  clearDesignLayer() {
    this.designLayer.destroyChildren();
    this.draw();
  }

  getPrintAreaBounds() {
    return {
      x: Math.round(this.printAreaRect.x()),
      y: Math.round(this.printAreaRect.y()),
      width: Math.round(this.printAreaRect.width()),
      height: Math.round(this.printAreaRect.height())
    };
  }

  getConstrainedPosition(node, nextPosition) {
    const current = { x: node.x(), y: node.y() };
    const offsetX = nextPosition.x - current.x;
    const offsetY = nextPosition.y - current.y;

    const bounds = this.getPrintAreaBounds();
    const currentBox = this.#getNodeBoxInDesignSpace(node);
    const nextBox = {
      x: currentBox.x + offsetX,
      y: currentBox.y + offsetY,
      width: currentBox.width,
      height: currentBox.height
    };

    const deltaX =
      nextBox.x < bounds.x
        ? bounds.x - nextBox.x
        : nextBox.x + nextBox.width > bounds.x + bounds.width
          ? bounds.x + bounds.width - (nextBox.x + nextBox.width)
          : 0;

    const deltaY =
      nextBox.y < bounds.y
        ? bounds.y - nextBox.y
        : nextBox.y + nextBox.height > bounds.y + bounds.height
          ? bounds.y + bounds.height - (nextBox.y + nextBox.height)
          : 0;

    return {
      x: nextPosition.x + deltaX,
      y: nextPosition.y + deltaY
    };
  }

  clampNodeToPrintArea(node) {
    const constrained = this.getConstrainedPosition(node, {
      x: node.x(),
      y: node.y()
    });

    node.position(constrained);
  }

  alignNodeHorizontally(node, alignment) {
    if (!node || !["left", "center", "right"].includes(alignment)) {
      return;
    }

    const bounds = this.getPrintAreaBounds();
    const box = this.#getNodeBoxInDesignSpace(node);
    let offsetX = 0;

    if (alignment === "left") {
      offsetX = bounds.x - box.x;
    }

    if (alignment === "center") {
      const boundsCenterX = bounds.x + bounds.width / 2;
      const boxCenterX = box.x + box.width / 2;
      offsetX = boundsCenterX - boxCenterX;
    }

    if (alignment === "right") {
      const boundsRightX = bounds.x + bounds.width;
      const boxRightX = box.x + box.width;
      offsetX = boundsRightX - boxRightX;
    }

    node.x(node.x() + offsetX);
    this.clampNodeToPrintArea(node);
    this.draw();
  }

  alignNodeVertically(node, alignment) {
    if (!node || !["top", "center", "bottom"].includes(alignment)) {
      return;
    }

    const bounds = this.getPrintAreaBounds();
    const box = this.#getNodeBoxInDesignSpace(node);
    let offsetY = 0;

    if (alignment === "top") {
      offsetY = bounds.y - box.y;
    }

    if (alignment === "center") {
      const boundsCenterY = bounds.y + bounds.height / 2;
      const boxCenterY = box.y + box.height / 2;
      offsetY = boundsCenterY - boxCenterY;
    }

    if (alignment === "bottom") {
      const boundsBottomY = bounds.y + bounds.height;
      const boxBottomY = box.y + box.height;
      offsetY = boundsBottomY - boxBottomY;
    }

    node.y(node.y() + offsetY);
    this.clampNodeToPrintArea(node);
    this.draw();
  }

  bringNodeToFront(node) {
    if (!node) {
      return;
    }

    node.moveToTop();
    this.draw();
  }

  sendNodeToBack(node) {
    if (!node) {
      return;
    }

    node.moveToBottom();
    this.draw();
  }

  centerNodeInPrintArea(node) {
    if (!node) {
      return;
    }

    const bounds = this.getPrintAreaBounds();
    const box = this.#getNodeBoxInDesignSpace(node);
    const printAreaCenterX = bounds.x + bounds.width / 2;
    const printAreaCenterY = bounds.y + bounds.height / 2;
    const nodeCenterX = box.x + box.width / 2;
    const nodeCenterY = box.y + box.height / 2;

    node.x(node.x() + (printAreaCenterX - nodeCenterX));
    node.y(node.y() + (printAreaCenterY - nodeCenterY));

    this.clampNodeToPrintArea(node);
  }

  setProductColor(color) {
    this.productShape.fill(color);
    this.draw();
  }

  setPanEnabled(enabled) {
    this.panEnabled = Boolean(enabled);
    this.stage.draggable(this.panEnabled);

    const container = this.stage.container();

    container.style.cursor = this.panEnabled ? "grab" : "default";

    if (!this.panEnabled) {
      this.stage.stopDrag();
    }

    this.stage.batchDraw();
  }

  resetViewport() {
    this.stage.scale({ x: 1, y: 1 });
    this.stage.position({ x: 0, y: 0 });
    this.stage.batchDraw();
  }

  applyDefaultViewport() {
    this.setPanEnabled(false);
    this.resetViewport();
  }

  getStage() {
    return this.stage;
  }

  getUILayer() {
    return this.uiLayer;
  }

  draw() {
    this.productLayer.batchDraw();
    this.designLayer.batchDraw();
    this.overlayLayer.batchDraw();
    this.uiLayer.batchDraw();
  }

  #bindWheelZoom() {
    this.stage.on("dragstart", () => {
      if (this.panEnabled) {
        this.stage.container().style.cursor = "grabbing";
      }
    });

    this.stage.on("dragend", () => {
      if (this.panEnabled) {
        this.stage.container().style.cursor = "grab";
      }
    });

    this.stage.on("wheel", (event) => {
      event.evt.preventDefault();

      const pointer = this.stage.getPointerPosition();

      if (!pointer) {
        return;
      }

      const oldScale = this.stage.scaleX() || 1;
      let direction = event.evt.deltaY > 0 ? -1 : 1;

      if (event.evt.ctrlKey) {
        direction = -direction;
      }

      const nextScaleRaw = direction > 0
        ? oldScale * this.zoomFactor
        : oldScale / this.zoomFactor;

      const nextScale = Math.min(this.zoomMax, Math.max(this.zoomMin, nextScaleRaw));

      if (Math.abs(nextScale - oldScale) < 0.0001) {
        return;
      }

      const pointTo = {
        x: (pointer.x - this.stage.x()) / oldScale,
        y: (pointer.y - this.stage.y()) / oldScale
      };

      this.stage.scale({ x: nextScale, y: nextScale });
      this.stage.position({
        x: pointer.x - pointTo.x * nextScale,
        y: pointer.y - pointTo.y * nextScale
      });

      this.stage.batchDraw();
    });
  }

  #syncDetailOverlay({ product, face, mockup }) {
    const isSudaderaFront = product?.id === "sudadera-urbana" && face?.id === "front";
    const isSudaderaBack = product?.id === "sudadera-urbana" && face?.id === "back";

    if (!this.hoodieLacesGroup || !this.hoodieBackHoodGroup || !this.hoodieBackHoodImage) {
      return;
    }

    if (!isSudaderaFront && !isSudaderaBack) {
      this.hoodieLacesGroup.visible(false);
      this.hoodieBackHoodGroup.visible(false);
      return;
    }

    const x = mockup.x ?? 100;
    const y = mockup.y ?? 50;
    const width = mockup.width ?? 560;
    const height = mockup.height ?? 740;

    if (isSudaderaBack) {
      const leftTopX = width * 0.36;
      const rightTopX = width * 0.64;
      const topY = height * 0.149;
      const leftShoulderX = width * 0.42;
      const rightShoulderX = width * 0.58;
      const shoulderY = height * 0.287;
      const bottomCenterY = height * 0.314;

      this.hoodieBackHoodGroup.position({ x, y });
      this.hoodieBackHoodImage.setAttrs({
        image: this.mockupImage.image(),
        x: 0,
        y: 0,
        width,
        height
      });
      this.hoodieBackHoodGroup.clipFunc((ctx) => {
        ctx.beginPath();
        ctx.moveTo(leftTopX, topY);
        ctx.lineTo(rightTopX, topY);
        ctx.quadraticCurveTo(width * 0.61, height * 0.223, rightShoulderX, shoulderY);
        ctx.quadraticCurveTo(width * 0.5, bottomCenterY, leftShoulderX, shoulderY);
        ctx.quadraticCurveTo(width * 0.39, height * 0.223, leftTopX, topY);
        ctx.closePath();
      });
      this.hoodieBackHoodGroup.visible(true);
      this.hoodieLacesGroup.visible(false);
      return;
    }

    const leftPoints = [
      x + width * 0.422,
      y + height * 0.19,
      x + width * 0.413,
      y + height * 0.566
    ];

    const rightPoints = [
      x + width * 0.578,
      y + height * 0.19,
      x + width * 0.569,
      y + height * 0.556
    ];

    const leftLace = this.hoodieLacesGroup.children[0];
    const rightLace = this.hoodieLacesGroup.children[1];
    const strokeWidth = Math.max(3, Math.round(width * 0.009));

    leftLace.points(leftPoints);
    rightLace.points(rightPoints);
    leftLace.strokeWidth(strokeWidth);
    rightLace.strokeWidth(strokeWidth);
    this.hoodieBackHoodGroup.visible(false);
    this.hoodieLacesGroup.visible(true);
  }

  #applyCalibrationVisualState() {
    this.printAreaRect.setAttrs({
      stroke: "#1c63ff",
      dash: [8, 6],
      strokeWidth: 2,
      fill: "rgba(28, 99, 255, 0.08)",
      fillEnabled: true,
      opacity: 1
    });
  }

  #normalizePrintAreaScale() {
    const minSize = 40;
    const width = Math.max(minSize, this.printAreaRect.width() * this.printAreaRect.scaleX());
    const height = Math.max(minSize, this.printAreaRect.height() * this.printAreaRect.scaleY());

    this.printAreaRect.setAttrs({
      width,
      height,
      scaleX: 1,
      scaleY: 1
    });
  }

  #constrainPrintAreaToSurface() {
    const surfaceBounds = this.#getSurfaceBounds();
    const minSize = 40;
    const width = Math.max(minSize, Math.min(this.printAreaRect.width(), surfaceBounds.width));
    const height = Math.max(minSize, Math.min(this.printAreaRect.height(), surfaceBounds.height));
    const maxX = surfaceBounds.x + surfaceBounds.width - width;
    const maxY = surfaceBounds.y + surfaceBounds.height - height;

    this.printAreaRect.setAttrs({
      width,
      height,
      x: Math.min(Math.max(this.printAreaRect.x(), surfaceBounds.x), maxX),
      y: Math.min(Math.max(this.printAreaRect.y(), surfaceBounds.y), maxY)
    });
  }

  #constrainPrintAreaBox(oldBox, newBox) {
    const minSize = 40;
    const surfaceBounds = this.#getSurfaceBounds();

    const width = Math.max(minSize, newBox.width);
    const height = Math.max(minSize, newBox.height);
    const maxX = surfaceBounds.x + surfaceBounds.width - width;
    const maxY = surfaceBounds.y + surfaceBounds.height - height;
    const x = Math.min(Math.max(newBox.x, surfaceBounds.x), maxX);
    const y = Math.min(Math.max(newBox.y, surfaceBounds.y), maxY);
    const fitsInsideSurface =
      width <= surfaceBounds.width &&
      height <= surfaceBounds.height;

    if (!fitsInsideSurface) {
      return oldBox;
    }

    return {
      ...newBox,
      x,
      y,
      width,
      height
    };
  }

  #getSurfaceBounds() {
    return {
      x: this.productShape.x(),
      y: this.productShape.y(),
      width: this.productShape.width(),
      height: this.productShape.height()
    };
  }

  #notifyPrintAreaChange() {
    this.#syncDesignLayerClip();

    if (!this.printAreaChangeListener) {
      return;
    }

    this.printAreaChangeListener(this.getPrintAreaBounds());
  }

  #syncDesignLayerClip() {
    const bounds = this.getPrintAreaBounds();

    this.designLayer.clip({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height
    });
  }

  async #syncMockupOverlay(mockup) {
    if (!mockup.src) {
      this.mockupImage.image(null);
      this.mockupImage.visible(false);
      return;
    }

    const requestId = ++this.mockupRequestId;

    try {
      const image = await this.#loadImage(mockup.src);

      if (requestId !== this.mockupRequestId) {
        return;
      }

      this.mockupImage.image(image);
      this.mockupImage.visible(true);
    } catch {
      if (requestId !== this.mockupRequestId) {
        return;
      }

      this.mockupImage.image(null);
      this.mockupImage.visible(false);
    }
  }

  #loadImage(source) {
    return new Promise((resolve, reject) => {
      const image = new Image();

      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Unable to load mockup: ${source}`));
      image.src = source;
    });
  }

  #getNodeBoxInDesignSpace(node) {
    return node.getClientRect({
      skipStroke: true,
      skipShadow: true,
      relativeTo: this.designLayer
    });
  }
}

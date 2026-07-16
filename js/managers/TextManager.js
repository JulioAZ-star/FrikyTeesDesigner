import { Config } from "../config/Config.js";
import { DESIGN_NODE_NAME } from "../core/NodeSerializer.js";

export class TextManager {
  constructor(canvasManager, selectionManager) {
    this.canvasManager = canvasManager;
    this.selectionManager = selectionManager;
    this.idCounter = 0;
  }

  addDefaultText() {
    const textNode = new Konva.Text({
      id: this.#nextId("text"),
      x: Config.text.x,
      y: Config.text.y,
      text: Config.text.value,
      fontSize: Config.text.fontSize,
      fontFamily: Config.text.fontFamily,
      fill: Config.text.fill,
      draggable: true,
      name: DESIGN_NODE_NAME
    });

    this.#attachCommonEvents(textNode);

    textNode.on("dblclick dbltap", () => {
      const updatedValue = prompt("Editar texto", textNode.text());

      if (updatedValue === null) {
        return;
      }

      textNode.text(updatedValue.trim() || Config.text.value);
      this.#fitTextToPrintArea(textNode);
      this.canvasManager.clampNodeToPrintArea(textNode);
      this.canvasManager.draw();
    });

    this.canvasManager.addNode(textNode);
    this.canvasManager.centerNodeInPrintArea(textNode);
    this.selectionManager.attachNode(textNode);
    this.selectionManager.select(textNode);
    this.canvasManager.draw();

    return textNode;
  }

  updateTextNode(node, { text, fill, fontSize, fontFamily, align, hAlign, fontStyleToggle }) {
    if (!node || node.className !== "Text") {
      return;
    }

    if (typeof text === "string") {
      node.text(text || Config.text.value);
    }

    if (typeof fill === "string") {
      node.fill(fill);
    }

    if (!Number.isNaN(Number(fontSize)) && Number(fontSize) > 0) {
      node.fontSize(Number(fontSize));
    }

    if (typeof fontFamily === "string" && fontFamily.trim()) {
      node.fontFamily(fontFamily);
    }

    if (typeof align === "string" && ["left", "center", "right"].includes(align)) {
      node.align(align);
    }

    if (typeof hAlign === "string" && ["left", "center", "right"].includes(hAlign)) {
      this.canvasManager.alignNodeHorizontally(node, hAlign);
    }

    if (fontStyleToggle === "bold" || fontStyleToggle === "italic") {
      const current = typeof node.fontStyle === "function" ? node.fontStyle() : "normal";
      const hasBold = current.includes("bold");
      const hasItalic = current.includes("italic");

      const nextBold = fontStyleToggle === "bold" ? !hasBold : hasBold;
      const nextItalic = fontStyleToggle === "italic" ? !hasItalic : hasItalic;

      const nextStyle = [nextBold ? "bold" : "", nextItalic ? "italic" : ""]
        .filter(Boolean)
        .join(" ") || "normal";

      node.fontStyle(nextStyle);
    }

    this.#fitTextToPrintArea(node);
    this.canvasManager.clampNodeToPrintArea(node);
    this.canvasManager.draw();
  }

  createFromSnapshot(data) {
    const node = new Konva.Text({
      id: data.id,
      x: data.x,
      y: data.y,
      width: data.width,
      height: data.height,
      scaleX: data.scaleX,
      scaleY: data.scaleY,
      rotation: data.rotation,
      draggable: data.draggable,
      name: DESIGN_NODE_NAME,
      text: data.text,
      fontSize: data.fontSize,
      fontFamily: data.fontFamily,
      fill: data.fill,
      fontStyle: data.fontStyle ?? "normal",
      align: data.align ?? "left"
    });

    node.setAttr("locked", Boolean(data.locked));
    node.draggable(!data.locked && data.draggable !== false);

    this.#attachCommonEvents(node);
    this.selectionManager.attachNode(node);

    return node;
  }

  #attachCommonEvents(node) {
    const saveTransform = () => {
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      const dominantScale = Math.max(Math.abs(scaleX), Math.abs(scaleY));

      if (scaleX !== 1 || scaleY !== 1) {
        node.fontSize(Math.max(8, node.fontSize() * dominantScale));
        node.scaleX(1);
        node.scaleY(1);
      }

      this.canvasManager.clampNodeToPrintArea(node);
      this.canvasManager.draw();
    };

    node.dragBoundFunc((position) => this.canvasManager.getConstrainedPosition(node, position));

    node.on("mouseenter", () => {
      this.canvasManager.getStage().container().style.cursor = Config.interaction.nodeHoverCursor;
    });

    node.on("mouseleave", () => {
      this.canvasManager.getStage().container().style.cursor = "default";
    });

    node.on("dragend", () => {
      this.canvasManager.clampNodeToPrintArea(node);
      this.canvasManager.draw();
    });

    node.on("transformend", saveTransform);
  }

  #fitTextToPrintArea(node) {
    const minFontSize = 8;
    const printArea = this.canvasManager.getPrintAreaBounds();
    const fitsBounds = () => {
      const box = node.getClientRect({
        skipStroke: true,
        skipShadow: true,
        relativeTo: node.getLayer?.() ?? undefined
      });

      return box.width <= printArea.width && box.height <= printArea.height;
    };

    if (fitsBounds()) {
      return;
    }

    let nextFontSize = Math.max(minFontSize, Math.floor(node.fontSize()));

    while (nextFontSize > minFontSize && !fitsBounds()) {
      nextFontSize -= 1;
      node.fontSize(nextFontSize);
    }
  }

  #nextId(prefix) {
    this.idCounter += 1;
    return `${prefix}-${Date.now()}-${this.idCounter}`;
  }
}

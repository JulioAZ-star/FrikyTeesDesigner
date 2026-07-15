const DESIGN_NODE_NAME = "design-item";

export class NodeSerializer {
  static serialize(node) {
    if (!node || node.name() !== DESIGN_NODE_NAME) {
      return null;
    }

    const common = {
      id: node.id(),
      x: node.x(),
      y: node.y(),
      width: node.width(),
      height: node.height(),
      scaleX: node.scaleX(),
      scaleY: node.scaleY(),
      rotation: node.rotation(),
      opacity: node.opacity(),
      draggable: node.draggable(),
      locked: Boolean(node.getAttr("locked")),
      name: node.name()
    };

    if (node.className === "Text") {
      return {
        type: "text",
        ...common,
        text: node.text(),
        fontSize: node.fontSize(),
        fontFamily: node.fontFamily(),
        fill: node.fill(),
        fontStyle: node.fontStyle(),
        align: node.align()
      };
    }

    if (node.className === "Image") {
      return {
        type: "image",
        ...common,
        src: node.getAttr("source") ?? ""
      };
    }

    return null;
  }

  static serializeMany(nodes) {
    return nodes
      .map((node) => NodeSerializer.serialize(node))
      .filter(Boolean);
  }
}

export { DESIGN_NODE_NAME };

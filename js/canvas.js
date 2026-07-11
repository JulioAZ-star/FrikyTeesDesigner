let stage;
let layer;
let transformer;

function initCanvas() {

    stage = new Konva.Stage({
        container: "canvas",
        width: 700,
        height: 800
    });

    layer = new Konva.Layer();

    transformer = new Konva.Transformer({
        rotateEnabled: true,
        keepRatio: true,
        enabledAnchors: [
            "top-left",
            "top-right",
            "bottom-left",
            "bottom-right"
        ]
    });

    layer.add(transformer);

    stage.add(layer);

    const area = new Konva.Rect({
        x: 150,
        y: 100,
        width: 400,
        height: 500,
        stroke: "#777",
        dash: [10, 5]
    });

    layer.add(area);

    layer.draw();
}
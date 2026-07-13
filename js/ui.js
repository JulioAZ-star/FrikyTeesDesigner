function initUI() {

    document.getElementById("addText").addEventListener("click", () => {

        const texto = new Konva.Text({

            x: 250,
            y: 220,

            text: "Tu texto",

            fontSize: 40,

            fontFamily: "Arial",

            fill: "#000",

            draggable: true

        });

        layer.add(texto);

        transformer.nodes([texto]);

        layer.draw();

        texto.on("click tap", () => {

            transformer.nodes([texto]);
            layer.draw();

        });

    });

}
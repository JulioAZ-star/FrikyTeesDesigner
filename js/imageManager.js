function initImageManager() {

    const imageLoader = document.getElementById("imageLoader");

    document
        .getElementById("addImage")
        .addEventListener("click", () => {

            imageLoader.click();

        });

    imageLoader.addEventListener("change", function (e) {

        const file = e.target.files[0];

        if (!file) return;

        const reader = new FileReader();

        reader.onload = function (event) {

            const img = new Image();

            img.onload = function () {

                const imagen = new Konva.Image({

                    x: 250,
                    y: 200,

                    image: img,

                    width: img.width,
                    height: img.height,

                    draggable: true

                });

                const maxSize = 250;

                if (imagen.width() > maxSize || imagen.height() > maxSize) {

                    const scale = Math.min(
                        maxSize / imagen.width(),
                        maxSize / imagen.height()
                    );

                    imagen.width(imagen.width() * scale);
                    imagen.height(imagen.height() * scale);
                }

                layer.add(imagen);

                imagen.on("click", () => {

                    transformer.nodes([imagen]);

                    layer.draw();

                });

                layer.draw();

            };

            img.src = event.target.result;

        };

        reader.readAsDataURL(file);

    });

    stage.on("click", function (e) {

        if (e.target === stage) {

            transformer.nodes([]);

            layer.draw();

        }

    });

}
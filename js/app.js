document.addEventListener("DOMContentLoaded", () => {

    document.getElementById("app").innerHTML = `
    <div class="designer">

        <aside class="left">
            <h2>Producto</h2>

            <h3>Color</h3>

            <button id="negro">Negro</button>
            <button id="blanco">Blanco</button>

            <h3>Talla</h3>

            <button>S</button>
            <button>M</button>
            <button>L</button>
            <button>XL</button>
            <button>XXL</button>

        </aside>

        <main class="center">

            <div id="canvas"></div>

        </main>

        <aside class="right">

            <button id="addImage">
                Añadir imagen
            </button>

            <button id="addText">
                Añadir texto
            </button>

        </aside>

    </div>
    `;

    initCanvas();
    initImageManager();

});
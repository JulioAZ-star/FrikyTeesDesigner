import { AppController } from "./controllers/AppController.js";
import productCatalog from "../data/products.json" with { type: "json" };

document.addEventListener("DOMContentLoaded", async () => {
  const app = new AppController(productCatalog);
  await app.init();
});

export class ProductManager {
  constructor(catalogDefinition) {
    const sourceProducts = Array.isArray(catalogDefinition)
      ? catalogDefinition
      : catalogDefinition?.products ?? [];

    this.products = sourceProducts.map((product) => this.#normalizeProduct(product));
    this.currentProductId = null;
    this.currentFaceId = null;
    this.productState = new Map();
    this.faceDesigns = new Map();
  }

  initialize() {
    if (this.products.length === 0) {
      throw new Error("Product catalog is empty");
    }

    for (const product of this.products) {
      const defaultFace = product.defaultFace ?? product.faces[0]?.id ?? null;
      const defaultColor = product.defaultColor ?? product.colors[0]?.value ?? null;
      const defaultSize = product.defaultSize ?? product.sizes[0] ?? null;

      this.productState.set(product.id, {
        faceId: defaultFace,
        color: defaultColor,
        size: defaultSize
      });

      for (const face of product.faces) {
        this.#setFaceDesign(product.id, face.id, []);
      }
    }

    const firstAvailableProduct = this.products.find((product) => !product.disabled) ?? this.products[0];
    this.setProduct(firstAvailableProduct.id);
  }

  getProducts() {
    return this.products;
  }

  exportCatalog() {
    return {
      products: this.#cloneNodes(this.products)
    };
  }

  getCurrentProductExport() {
    const product = this.getCurrentProduct();

    if (!product) {
      return null;
    }

    return this.#cloneNodes(product);
  }

  getCurrentProduct() {
    return this.products.find((product) => product.id === this.currentProductId) ?? null;
  }

  getCurrentFace() {
    const product = this.getCurrentProduct();

    if (!product) {
      return null;
    }

    return product.faces.find((face) => face.id === this.currentFaceId) ?? null;
  }

  getCurrentColor() {
    return this.#getProductState(this.currentProductId)?.color ?? null;
  }

  getCurrentSize() {
    return this.#getProductState(this.currentProductId)?.size ?? null;
  }

  setProduct(productId) {
    const product = this.products.find((item) => item.id === productId);

    if (!product || product.disabled) {
      return null;
    }

    this.currentProductId = product.id;

    const state = this.#getProductState(product.id);
    this.currentFaceId = state.faceId;

    return this.getSurfaceState();
  }

  setFace(faceId) {
    const product = this.getCurrentProduct();

    if (!product || !product.faces.some((face) => face.id === faceId)) {
      return null;
    }

    const state = this.#getProductState(product.id);
    state.faceId = faceId;
    this.currentFaceId = faceId;

    return this.getSurfaceState();
  }

  setColor(colorValue) {
    const product = this.getCurrentProduct();

    if (!product || !product.colors.some((color) => color.value === colorValue)) {
      return null;
    }

    this.#getProductState(product.id).color = colorValue;
    return this.getSurfaceState();
  }

  setSize(sizeValue) {
    const product = this.getCurrentProduct();

    if (!product || !product.sizes.includes(sizeValue)) {
      return null;
    }

    this.#getProductState(product.id).size = sizeValue;
    return this.getSurfaceState();
  }

  saveCurrentFaceDesign(nodes) {
    if (!this.currentProductId || !this.currentFaceId) {
      return;
    }

    this.#setFaceDesign(this.currentProductId, this.currentFaceId, nodes);
  }

  getCurrentFaceDesign() {
    if (!this.currentProductId || !this.currentFaceId) {
      return [];
    }

    return this.#cloneNodes(this.#getFaceDesign(this.currentProductId, this.currentFaceId));
  }

  getSurfaceState() {
    const product = this.getCurrentProduct();
    const face = this.getCurrentFace();

    if (!product || !face) {
      return null;
    }

    return {
      product,
      face,
      color: this.getCurrentColor(),
      size: this.getCurrentSize(),
      nodes: this.getCurrentFaceDesign()
    };
  }

  updateCurrentFacePrintArea(printArea) {
    const product = this.getCurrentProduct();
    const face = this.getCurrentFace();

    if (!product || !face || !printArea) {
      return null;
    }

    face.printArea = {
      ...(face.printArea ?? product.printArea ?? {}),
      x: Number(printArea.x),
      y: Number(printArea.y),
      width: Number(printArea.width),
      height: Number(printArea.height)
    };

    product.printArea = {
      ...(product.printArea ?? {}),
      x: Number(printArea.x),
      y: Number(printArea.y),
      width: Number(printArea.width),
      height: Number(printArea.height)
    };

    return this.getSurfaceState();
  }

  #normalizeProduct(product) {
    const faces = (product.faces ?? []).map((face) => ({
      id: face.id,
      name: face.name,
      mockup: face.mockup ?? product.mockup,
      printArea: face.printArea ?? product.printArea
    }));

    return {
      id: product.id,
      name: product.name,
      disabled: Boolean(product.disabled),
      colors: product.colors ?? [],
      sizes: product.sizes ?? [],
      mockup: product.mockup,
      printArea: product.printArea,
      faces,
      defaultFace: product.defaultFace ?? faces[0]?.id ?? null,
      defaultColor: product.defaultColor ?? product.colors?.[0]?.value ?? null,
      defaultSize: product.defaultSize ?? product.sizes?.[0] ?? null
    };
  }

  #getProductState(productId) {
    return this.productState.get(productId) ?? null;
  }

  #getFaceDesign(productId, faceId) {
    return this.faceDesigns.get(`${productId}:${faceId}`) ?? [];
  }

  #setFaceDesign(productId, faceId, nodes) {
    this.faceDesigns.set(`${productId}:${faceId}`, this.#cloneNodes(nodes));
  }

  #cloneNodes(nodes) {
    return JSON.parse(JSON.stringify(nodes ?? []));
  }
}

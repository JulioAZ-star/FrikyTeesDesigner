export class PricingManager {
  calculateOrder({ product, size, faceStatus }) {
    const pricing = product?.pricing ?? {};
    const childrenPricing = pricing.children ?? {};
    const childrenSizes = Array.isArray(childrenPricing.sizes)
      ? childrenPricing.sizes
      : [];
    const isChildrenSize = childrenSizes.includes(size);
    const singleSide = Number(
      isChildrenSize
        ? childrenPricing.singleSide
        : pricing.singleSide
    ) || 0;
    const doubleSide = Number(
      isChildrenSize
        ? childrenPricing.doubleSide
        : pricing.doubleSide
    ) || 0;

    const frontCustomized = Boolean(faceStatus?.front);
    const backCustomized = Boolean(faceStatus?.back);

    let total = 0;

    if (frontCustomized && backCustomized) {
      total = doubleSide;
    } else if (frontCustomized || backCustomized) {
      total = singleSide;
    }

    return {
      singleSide,
      doubleSide,
      frontCustomized,
      backCustomized,
      isChildrenSize,
      total
    };
  }
}

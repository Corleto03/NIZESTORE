export interface ProductVariant {
  precio: number | string;
  stock_disponible: number;
}

export interface CatalogProduct {
  id_producto: number;
  nombre_producto: string;
  fecha_registro: Date | string;
  producto_variante: ProductVariant[];
  [key: string]: any;
}

export type SortOption = "newest" | "price_asc" | "price_desc" | "relevance";

export function getProductLowestPrice(product: CatalogProduct): number {
  if (!product.producto_variante || product.producto_variante.length === 0) {
    return 0;
  }
  return Math.min(...product.producto_variante.map((v) => Number(v.precio)));
}

export function getProductTotalStock(product: CatalogProduct): number {
  if (!product.producto_variante || product.producto_variante.length === 0) {
    return 0;
  }
  return product.producto_variante.reduce((sum, v) => sum + (v.stock_disponible || 0), 0);
}

export function sortProducts(
  products: CatalogProduct[],
  sortOption: SortOption
): CatalogProduct[] {
  const cloned = [...products];

  switch (sortOption) {
    case "price_asc":
      return cloned.sort(
        (a, b) => getProductLowestPrice(a) - getProductLowestPrice(b)
      );
    case "price_desc":
      return cloned.sort(
        (a, b) => getProductLowestPrice(b) - getProductLowestPrice(a)
      );
    case "newest":
      return cloned.sort(
        (a, b) =>
          new Date(b.fecha_registro).getTime() -
          new Date(a.fecha_registro).getTime()
      );
    default:
      return cloned;
  }
}

export function filterProductsByPrice(
  products: CatalogProduct[],
  minPrice?: number,
  maxPrice?: number
): CatalogProduct[] {
  return products.filter((p) => {
    const price = getProductLowestPrice(p);
    if (minPrice !== undefined && price < minPrice) return false;
    if (maxPrice !== undefined && price > maxPrice) return false;
    return true;
  });
}

export function filterProductsByStock(
  products: CatalogProduct[],
  onlyInStock: boolean
): CatalogProduct[] {
  if (!onlyInStock) return products;
  return products.filter((p) => getProductTotalStock(p) > 0);
}

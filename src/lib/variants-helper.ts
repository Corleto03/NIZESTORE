export interface VariantAppearance {
  talla?: string | null;
  color?: string | null;
}

export interface VariantItem {
  id_variante: number;
  sku?: string | null;
  precio: number | string;
  costo?: number | string | null;
  stock_disponible: number;
  url_imagen?: string | null;
  descripcion_variante?: string | null;
  variante_apariencia?: VariantAppearance | null;
  [key: string]: any;
}

export interface ProductWithVariants {
  id_producto: number;
  nombre_producto: string;
  descripcion?: string | null;
  url_imagen?: string | null;
  producto_variante: VariantItem[];
  [key: string]: any;
}

export interface VariantDisplayData {
  activeImage: string;
  activePrice: number;
  activeCost: number;
  activeStock: number;
  activeSku: string;
  activeDescription: string;
  isAvailable: boolean;
}

/**
 * Extracts distinct attribute values (e.g. unique sizes and colors) from product variants
 */
export function getDistinctAttributes(variants: VariantItem[]): {
  tallas: string[];
  colores: string[];
} {
  const tallasSet = new Set<string>();
  const coloresSet = new Set<string>();

  for (const v of variants) {
    if (v.variante_apariencia?.talla) {
      tallasSet.add(v.variante_apariencia.talla.trim());
    }
    if (v.variante_apariencia?.color) {
      coloresSet.add(v.variante_apariencia.color.trim());
    }
  }

  return {
    tallas: Array.from(tallasSet),
    colores: Array.from(coloresSet)
  };
}

/**
 * Finds a matching variant given attribute selections (talla, color)
 */
export function findVariantByAttributes(
  variants: VariantItem[],
  selected: { talla?: string | null; color?: string | null }
): VariantItem | undefined {
  return variants.find((v) => {
    const vTalla = v.variante_apariencia?.talla?.trim();
    const vColor = v.variante_apariencia?.color?.trim();

    const matchTalla = selected.talla ? vTalla === selected.talla.trim() : true;
    const matchColor = selected.color ? vColor === selected.color.trim() : true;

    return matchTalla && matchColor;
  });
}

/**
 * Resolves the dynamic display values (image, price, stock, description)
 * based on selected variant and base product
 */
export function resolveVariantDisplay(
  product: ProductWithVariants,
  variant?: VariantItem | null
): VariantDisplayData {
  const defaultImg = product.url_imagen || "/images/products/one-piece-vol-100.jpeg";
  const defaultDesc = product.descripcion || "";

  if (!variant) {
    const first = product.producto_variante?.[0];
    return {
      activeImage: first?.url_imagen || defaultImg,
      activePrice: first ? Number(first.precio) : 0,
      activeCost: first && first.costo ? Number(first.costo) : 0,
      activeStock: first ? first.stock_disponible : 0,
      activeSku: first?.sku || `NZ-${product.id_producto}`,
      activeDescription: first?.descripcion_variante || defaultDesc,
      isAvailable: first ? first.stock_disponible > 0 : false
    };
  }

  const stock = variant.stock_disponible || 0;

  return {
    activeImage: variant.url_imagen || defaultImg,
    activePrice: Number(variant.precio),
    activeCost: variant.costo ? Number(variant.costo) : 0,
    activeStock: stock,
    activeSku: variant.sku || `NZ-${product.id_producto}-${variant.id_variante}`,
    activeDescription: variant.descripcion_variante || defaultDesc,
    isAvailable: stock > 0
  };
}

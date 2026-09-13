import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  findVariantByAttributes,
  getDistinctAttributes,
  resolveVariantDisplay,
  ProductWithVariants,
  VariantItem
} from "../src/lib/variants-helper";

describe("WooCommerce Style Variable Products Logic (TDD)", () => {
  const mockProduct: ProductWithVariants = {
    id_producto: 5,
    nombre_producto: "Camiseta Anime Oversize",
    descripcion: "Camiseta de alta calidad con serigrafía.",
    url_imagen: "/images/products/default.jpeg",
    producto_variante: [
      {
        id_variante: 101,
        sku: "TS-BLK-M",
        precio: 25.0,
        costo: 12.0,
        stock_disponible: 8,
        url_imagen: "/images/products/shirt-black.jpeg",
        descripcion_variante: "Edición Negro Obsidiana con estampado reflectivo.",
        variante_apariencia: { talla: "M", color: "Negro" }
      },
      {
        id_variante: 102,
        sku: "TS-BLK-L",
        precio: 25.0,
        costo: 12.0,
        stock_disponible: 0, // Agotado
        url_imagen: "/images/products/shirt-black.jpeg",
        descripcion_variante: "Edición Negro Obsidiana talla L.",
        variante_apariencia: { talla: "L", color: "Negro" }
      },
      {
        id_variante: 103,
        sku: "TS-WHT-M",
        precio: 27.5, // Precio diferente por color/edición
        costo: 13.0,
        stock_disponible: 4,
        url_imagen: "/images/products/shirt-white.jpeg",
        descripcion_variante: "Edición Blanco Marfil con estampado a todo color.",
        variante_apariencia: { talla: "M", color: "Blanco" }
      }
    ]
  };

  it("should extract distinct attribute values (tallas y colores) correctly", () => {
    const { tallas, colores } = getDistinctAttributes(mockProduct.producto_variante);
    assert.deepEqual(tallas, ["M", "L"]);
    assert.deepEqual(colores, ["Negro", "Blanco"]);
  });

  it("should find the exact variant matching both talla and color", () => {
    const found = findVariantByAttributes(mockProduct.producto_variante, {
      talla: "M",
      color: "Blanco"
    });
    assert.ok(found);
    assert.equal(found?.id_variante, 103);
    assert.equal(found?.sku, "TS-WHT-M");
  });

  it("should return null or undefined if combination does not exist", () => {
    const found = findVariantByAttributes(mockProduct.producto_variante, {
      talla: "XL",
      color: "Blanco"
    });
    assert.equal(found, undefined);
  });

  it("should resolve variant display data with its specific image, price, and variant description", () => {
    const variant103 = mockProduct.producto_variante[2]; // Blanco M
    const display = resolveVariantDisplay(mockProduct, variant103);

    // Image changes to variant image
    assert.equal(display.activeImage, "/images/products/shirt-white.jpeg");
    // Price updates to variant price
    assert.equal(display.activePrice, 27.5);
    // Stock is individual
    assert.equal(display.activeStock, 4);
    assert.equal(display.isAvailable, true);
    // Description is variant specific
    assert.equal(
      display.activeDescription,
      "Edición Blanco Marfil con estampado a todo color."
    );
  });

  it("should correctly identify out-of-stock variant and disable availability", () => {
    const variant102 = mockProduct.producto_variante[1]; // Negro L (stock 0)
    const display = resolveVariantDisplay(mockProduct, variant102);

    assert.equal(display.activeStock, 0);
    assert.equal(display.isAvailable, false);
  });

  it("should fallback to base product image and description if variant has none", () => {
    const variantNoImage: VariantItem = {
      id_variante: 104,
      sku: "TS-BASIC",
      precio: 20.0,
      costo: 10.0,
      stock_disponible: 2,
      url_imagen: null,
      descripcion_variante: null,
      variante_apariencia: { talla: "S", color: "Gris" }
    };
    const display = resolveVariantDisplay(mockProduct, variantNoImage);

    assert.equal(display.activeImage, "/images/products/default.jpeg");
    assert.equal(display.activeDescription, "Camiseta de alta calidad con serigrafía.");
  });
});

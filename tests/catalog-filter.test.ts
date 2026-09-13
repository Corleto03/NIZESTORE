import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  sortProducts,
  filterProductsByPrice,
  filterProductsByStock
} from "../src/lib/catalog-filter";

describe("Catalog Filter & Sorting Logic (TDD)", () => {
  const mockProducts = [
    {
      id_producto: 1,
      nombre_producto: "Manga One Piece 100",
      fecha_registro: new Date("2026-01-01"),
      producto_variante: [{ precio: 12.0, stock_disponible: 5 }]
    },
    {
      id_producto: 2,
      nombre_producto: "Figura Sukuna 22cm",
      fecha_registro: new Date("2026-03-01"),
      producto_variante: [{ precio: 45.0, stock_disponible: 0 }]
    },
    {
      id_producto: 3,
      nombre_producto: "Camiseta Akatsuki",
      fecha_registro: new Date("2026-02-01"),
      producto_variante: [{ precio: 22.5, stock_disponible: 10 }]
    }
  ];

  it("should sort products by price ascending", () => {
    const sorted = sortProducts(mockProducts as any, "price_asc");
    assert.equal(sorted[0].id_producto, 1); // 12.0
    assert.equal(sorted[1].id_producto, 3); // 22.5
    assert.equal(sorted[2].id_producto, 2); // 45.0
  });

  it("should sort products by price descending", () => {
    const sorted = sortProducts(mockProducts as any, "price_desc");
    assert.equal(sorted[0].id_producto, 2); // 45.0
    assert.equal(sorted[1].id_producto, 3); // 22.5
    assert.equal(sorted[2].id_producto, 1); // 12.0
  });

  it("should sort products by newest date", () => {
    const sorted = sortProducts(mockProducts as any, "newest");
    assert.equal(sorted[0].id_producto, 2); // March
    assert.equal(sorted[1].id_producto, 3); // February
    assert.equal(sorted[2].id_producto, 1); // January
  });

  it("should filter products within a min and max price range", () => {
    const filtered = filterProductsByPrice(mockProducts as any, 15, 30);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id_producto, 3); // 22.50
  });

  it("should filter only in-stock products", () => {
    const inStock = filterProductsByStock(mockProducts as any, true);
    assert.equal(inStock.length, 2);
    assert.ok(!inStock.some((p) => p.id_producto === 2)); // Sukuna has 0 stock
  });
});

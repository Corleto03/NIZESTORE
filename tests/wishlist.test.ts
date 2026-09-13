import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  addToWishlist,
  removeFromWishlist,
  isProductInWishlist,
  toggleWishlistItem,
  WishlistItem
} from "../src/lib/wishlist-helper";

describe("Wishlist Helper Logic (TDD)", () => {
  const sampleItem: WishlistItem = {
    id_producto: 10,
    nombre_producto: "Figura Chainsaw Man",
    precio: 34.99,
    url_imagen: "/images/products/chainsaw.jpeg",
    franquicia: "Chainsaw Man"
  };

  it("should add item to an empty wishlist", () => {
    const list = addToWishlist([], sampleItem);
    assert.equal(list.length, 1);
    assert.equal(list[0].id_producto, 10);
  });

  it("should not duplicate item if already in wishlist", () => {
    const list1 = addToWishlist([], sampleItem);
    const list2 = addToWishlist(list1, sampleItem);
    assert.equal(list2.length, 1);
  });

  it("should check correctly if product is in wishlist", () => {
    const list = [sampleItem];
    assert.equal(isProductInWishlist(list, 10), true);
    assert.equal(isProductInWishlist(list, 99), false);
  });

  it("should remove an item from wishlist", () => {
    const list = [sampleItem];
    const updated = removeFromWishlist(list, 10);
    assert.equal(updated.length, 0);
  });

  it("should toggle wishlist state (add if absent, remove if present)", () => {
    // 1. Add
    const afterAdd = toggleWishlistItem([], sampleItem);
    assert.equal(afterAdd.length, 1);
    assert.equal(afterAdd[0].id_producto, 10);

    // 2. Remove
    const afterRemove = toggleWishlistItem(afterAdd, sampleItem);
    assert.equal(afterRemove.length, 0);
  });
});

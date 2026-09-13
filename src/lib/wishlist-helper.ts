export interface WishlistItem {
  id_producto: number;
  nombre_producto: string;
  precio: number;
  url_imagen?: string | null;
  franquicia?: string | null;
}

export function addToWishlist(
  currentList: WishlistItem[],
  item: WishlistItem
): WishlistItem[] {
  if (currentList.some((p) => p.id_producto === item.id_producto)) {
    return currentList;
  }
  return [item, ...currentList];
}

export function removeFromWishlist(
  currentList: WishlistItem[],
  productId: number
): WishlistItem[] {
  return currentList.filter((p) => p.id_producto !== productId);
}

export function isProductInWishlist(
  currentList: WishlistItem[],
  productId: number
): boolean {
  return currentList.some((p) => p.id_producto === productId);
}

export function toggleWishlistItem(
  currentList: WishlistItem[],
  item: WishlistItem
): WishlistItem[] {
  if (isProductInWishlist(currentList, item.id_producto)) {
    return removeFromWishlist(currentList, item.id_producto);
  }
  return addToWishlist(currentList, item);
}

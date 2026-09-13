"use client";

import { createContext, useContext, useState, useEffect } from "react";
import {
  WishlistItem,
  addToWishlist,
  removeFromWishlist,
  isProductInWishlist,
  toggleWishlistItem
} from "@/lib/wishlist-helper";

interface WishlistContextType {
  wishlist: WishlistItem[];
  addToWishlist: (item: WishlistItem) => void;
  removeFromWishlist: (productId: number) => void;
  isWishlisted: (productId: number) => boolean;
  toggleWishlist: (item: WishlistItem) => void;
  wishlistCount: number;
}

const WishlistContext = createContext<WishlistContextType | null>(null);

const STORAGE_KEY = "nizestore_wishlist";

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setWishlist(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Error reading wishlist from localStorage", e);
    }
    setMounted(true);
  }, []);

  const saveList = (newList: WishlistItem[]) => {
    setWishlist(newList);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    } catch (e) {
      console.error("Error saving wishlist to localStorage", e);
    }
  };

  const handleAdd = (item: WishlistItem) => {
    saveList(addToWishlist(wishlist, item));
  };

  const handleRemove = (productId: number) => {
    saveList(removeFromWishlist(wishlist, productId));
  };

  const handleToggle = (item: WishlistItem) => {
    saveList(toggleWishlistItem(wishlist, item));
  };

  const checkWishlisted = (productId: number) => {
    return isProductInWishlist(wishlist, productId);
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        addToWishlist: handleAdd,
        removeFromWishlist: handleRemove,
        isWishlisted: checkWishlisted,
        toggleWishlist: handleToggle,
        wishlistCount: mounted ? wishlist.length : 0
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
};

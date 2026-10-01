"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Product } from "../data/mock";
import { apiClient } from "../lib/apiClient";
import { io } from "socket.io-client";

type CartItem = {
  productId: string;
  variantId: string;
  size: number;
  price: number;
  quantity: number;
  reservationId?: string;
  expiresAt?: string;
  serverTime?: string;
  image?: string;
  title?: string;
  brand?: string;
};

export interface ClientInventoryItem {
  id?: string;
  productTitle: string;
  size: number;
  available: number;
}

export interface WaitlistItem {
  product?: {
    title: string;
    size: number;
  };
  position: number;
}

interface StoreContextType {
  // Global App State
  products: Product[];
  inventory: ClientInventoryItem[];
  user: Record<string, unknown> | null;
  setUser: (u: Record<string, unknown> | null) => void;
  waitlist: WaitlistItem[];
  fetchWaitlist: () => void;
  fetchInventory: () => void;
  logout: () => void;

  // Catalog State
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategories: string[];
  toggleCategory: (category: string) => void;
  priceRange: [number, number];
  setPriceRange: (range: [number, number]) => void;
  selectedSizes: number[];
  toggleSize: (size: number) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;

  // Active Product State
  activeProductId: string | null;
  setActiveProductId: (id: string | null) => void;
  activeProduct: Product | null;

  // Cart State (Used for active reservation now)
  cartItems: CartItem[];
  setCartItems: (items: CartItem[]) => void;
  addToCart: (item: CartItem) => void;
  cartCount: number;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<ClientInventoryItem[]>([]);
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [waitlist, setWaitlist] = useState<WaitlistItem[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["Sneakers"]);
  const [priceRange, setPriceRange] = useState<[number, number]>([20000, 80000]);
  const [selectedSizes, setSelectedSizes] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState("Price");
  
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const activeProduct = products.find((p) => p.id === activeProductId) || null;

  const fetchProducts = async () => {
    try {
      const res = await apiClient("/api/products");
      if (res.success) {
        setProducts(res.products);
        if (!activeProductId && res.products.length > 0) {
          setActiveProductId(res.products[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchInventory = async () => {
    try {
      const res = await apiClient("/api/inventory");
      if (res.success) setInventory(res.inventory);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUser = async () => {
    try {
      const res = await apiClient("/api/auth/me");
      if (res.success) {
        setUser(res.user);
      } else {
        setUser(null);
      }
    } catch (e: unknown) {
      if ((e as { status?: number }).status !== 401) {
        console.error("Failed to fetch user:", (e as { message?: string }).message || e);
      }
      setUser(null);
    }
  };

  const fetchWaitlist = async () => {
    if (!user) return;
    try {
      const res = await apiClient("/api/waitlist/me");
      if (res.success) setWaitlist(res.waitlist);
    } catch (e: unknown) {
      if ((e as { status?: number }).status !== 401) {
        console.error("Failed to fetch waitlist:", e);
      }
    }
  };

  const logout = async () => {
    try {
      await apiClient("/api/auth/logout", { method: "POST" });
      setUser(null);
      setWaitlist([]);
      setCartItems([]);
    } catch (e) {
      console.error(e);
    }
  };

  // Initial load
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProducts();
    fetchInventory();
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch waitlist when user changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchWaitlist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Realtime Socket
  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';
    const socket = io(baseUrl, { withCredentials: true });

    socket.on('inventory.updated', fetchInventory);
    socket.on('reservation.created', () => { fetchInventory(); fetchWaitlist(); });
    socket.on('reservation.expired', (data) => { 
      fetchInventory(); 
      fetchWaitlist();
      setCartItems((prev) => prev.filter(item => item.reservationId !== data?.reservationId));
    });
    socket.on('reservation.allocated', () => { fetchInventory(); fetchWaitlist(); });
    socket.on('order.completed', () => { fetchInventory(); fetchWaitlist(); });
    socket.on('waitlist.updated', fetchWaitlist);

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // re-connect if auth state changes to use new cookie? io handles it on its own mostly, but user dep is fine.

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const toggleSize = (size: number) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const addToCart = (item: CartItem) => {
    setCartItems([item]); // Max 1 active reservation per user enforced by UI
  };

  const cartCount = cartItems.length; // Max 1

  return (
    <StoreContext.Provider
      value={{
        products,
        inventory,
        user,
        setUser,
        waitlist,
        fetchWaitlist,
        fetchInventory,
        logout,
        searchQuery,
        setSearchQuery,
        selectedCategories,
        toggleCategory,
        priceRange,
        setPriceRange,
        selectedSizes,
        toggleSize,
        sortBy,
        setSortBy,
        activeProductId,
        setActiveProductId,
        activeProduct,
        cartItems,
        setCartItems,
        addToCart,
        cartCount,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}

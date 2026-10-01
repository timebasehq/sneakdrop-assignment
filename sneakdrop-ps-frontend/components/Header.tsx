"use client";

import React, { useState, useEffect } from "react";
import { Search, ShoppingCart } from "lucide-react";
import { useStore } from "../store/StoreContext";
import { apiClient } from "../lib/apiClient";

export function Header() {
  const { searchQuery, setSearchQuery, cartCount, user, logout, cartItems, setCartItems } = useStore();

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const cartItem = cartItems[0];

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cartItem && cartItem.expiresAt && cartItem.serverTime) {
      const initialLocalNowMs = Date.now();
      const serverNowMs = new Date(cartItem.serverTime).getTime();
      const offset = serverNowMs - initialLocalNowMs;

      timer = setInterval(() => {
        const currentLocalNowMs = Date.now();
        const currentEstimatedServerMs = currentLocalNowMs + offset;
        const expirationMs = new Date(cartItem.expiresAt!).getTime();
        const remaining = Math.floor((expirationMs - currentEstimatedServerMs) / 1000);
        
        if (remaining <= 0) {
          setTimeLeft(0);
          setCartItems([]);
          setIsCartOpen(false);
        } else {
          setTimeLeft(remaining);
        }
      }, 1000);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTimeLeft(null);
    }
    return () => clearInterval(timer);
  }, [cartItem, setCartItems]);

  return (
    <header className="w-full h-20 px-8 flex items-center justify-between bg-white border-b border-neutral-100 sticky top-0 z-50">
      {/* Brand Logo */}
      <div className="flex items-center">
        <h1 className="text-2xl font-bold tracking-tight text-black">
          Shoe<span className="text-black">.</span>
        </h1>
      </div>

      {/* Search Bar */}
      <div className="flex-1 max-w-2xl mx-12">
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-neutral-500 group-focus-within:text-black transition-colors" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Black Sneakers"
            className="w-full h-12 pl-12 pr-4 bg-white border border-neutral-200 rounded-full text-sm outline-none focus:border-black focus:ring-1 focus:ring-black transition-all shadow-sm placeholder:text-neutral-500 text-black font-medium"
          />
        </div>
      </div>

      {/* Nav Actions */}
      <div className="flex items-center gap-6">
        <div className="relative cursor-pointer">
          <div className="relative" onClick={() => setIsCartOpen(!isCartOpen)}>
            <div className="p-2 rounded-full bg-neutral-50 hover:bg-neutral-100 transition-colors">
              <ShoppingCart className="h-5 w-5 text-neutral-700" />
            </div>
            {cartCount > 0 && (
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] min-w-[16px] h-[16px] flex items-center justify-center rounded-full px-1 font-bold">
                {cartCount}
              </div>
            )}
          </div>
          
          {/* Cart Dropdown */}
          {isCartOpen && (
            <div className="absolute top-12 right-0 w-80 bg-white border border-neutral-200 rounded-2xl shadow-2xl p-4 z-50 flex flex-col gap-4">
              <h3 className="font-bold text-black border-b border-neutral-100 pb-2">Your Cart</h3>
              {cartItem ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-neutral-100 rounded-xl relative flex-shrink-0 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={cartItem.image} alt={cartItem.title} className="w-full h-full object-contain p-2 mix-blend-multiply" />
                    </div>
                    <div className="flex flex-col flex-1">
                      <span className="text-sm font-bold text-black">{cartItem.brand}</span>
                      <span className="text-xs text-neutral-500">{cartItem.title}</span>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs font-semibold text-black">Size: {cartItem.size}</span>
                        <span className="text-sm font-bold text-black">₹ {cartItem.price.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-neutral-50 p-3 rounded-xl flex items-center justify-between border border-neutral-100">
                    <span className="text-xs font-bold text-neutral-500 uppercase">Hold Expires In</span>
                    <span className="text-sm font-black text-red-500">
                      {timeLeft !== null ? `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}` : '0:00'}
                    </span>
                  </div>
                  <button 
                    onClick={async () => {
                      if (cartItem.reservationId) {
                        try {
                          await apiClient(`/api/reservations/${cartItem.reservationId}`, { method: 'DELETE' });
                        } catch (e) {
                          console.error(e);
                        }
                      }
                      setCartItems([]);
                    }}
                    className="w-full py-2 text-xs font-bold text-red-500 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
                  >
                    Cancel Reservation
                  </button>
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-neutral-500">
                  Your cart is empty.
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="relative cursor-pointer group rounded-full p-1 border-2 border-transparent hover:border-neutral-200 transition-all">
          {user ? (
             <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff"
                  alt="User avatar"
                  className="w-9 h-9 border border-neutral-200 rounded-full object-cover"
                />
                <button onClick={logout} className="text-xs font-bold text-neutral-500 hover:text-black">Logout</button>
             </div>
          ) : (
             <div className="w-9 h-9 border border-neutral-200 rounded-full flex items-center justify-center bg-neutral-50">
               <span className="text-xs font-bold text-neutral-400">?</span>
             </div>
          )}
        </div>
      </div>
    </header>
  );
}

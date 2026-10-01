"use client";

import React, { useState, useEffect } from "react";
import { ShoppingBag, ChevronDown, ChevronUp, Check, ArrowLeft, CreditCard, User, Clock } from "lucide-react";
import Image from "next/image";
import { useStore } from "../store/StoreContext";
import confetti from "canvas-confetti";
import { apiClient } from "../lib/apiClient";
import { getSafeImage } from "../utils/format";
import { useToast } from "./ToastContext";

export function ProductDetailPanel() {
  const { activeProduct, user, setUser, fetchWaitlist, waitlist, inventory, cartItems, setCartItems, addToCart } = useStore();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [view, setView] = useState<'product' | 'checkout' | 'success' | 'waitlist'>('product');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [dummyCard, setDummyCard] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  
  // Auth state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  
  const { addToast } = useToast();

  useEffect(() => {
    if (activeProduct) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setView('product');
      setActiveImageIndex(0);
      setSelectedSize(activeProduct.sizes[0] || null);
    }
  }, [activeProduct]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (view === 'checkout' && cartItems[0]) {
      const initialLocalNowMs = Date.now();
      const serverNowMs = new Date(cartItems[0].serverTime!).getTime();
      const offset = serverNowMs - initialLocalNowMs;

      timer = setInterval(() => {
        const currentLocalNowMs = Date.now();
        const currentEstimatedServerMs = currentLocalNowMs + offset;
        const expirationMs = new Date(cartItems[0].expiresAt!).getTime();
        const remaining = Math.floor((expirationMs - currentEstimatedServerMs) / 1000);
        
        if (remaining <= 0) {
          setTimeLeft(0);
          clearInterval(timer);
          setCartItems([]);
          setView('product');
          addToast('Your reservation has expired and the pair has been released.', 'error');
        } else {
          setTimeLeft(remaining);
        }
      }, 1000);
    } else if (view === 'checkout' && !cartItems[0]) {
       // eslint-disable-next-line react-hooks/set-state-in-effect
       setView('product');
    }
    return () => clearInterval(timer);
  }, [view, cartItems, setCartItems, addToast]);

  if (!activeProduct) {
    return (
      <div className="w-full h-full flex items-center justify-center text-neutral-400">
        Select a product to view details
      </div>
    );
  }

  const handleAuth = async () => {
    if (!username.trim() || !password.trim()) return;
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const res = await apiClient(endpoint, {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      if (res.success) {
        setUser(res.user);
        setIsAuthModalOpen(false);
        // Automatically attempt reservation again if desired
      }
    } catch (e: unknown) {
      addToast((e as { message?: string }).message || "Authentication failed", 'error');
    }
  };

  const handleAddToCartOrBuy = async () => {
    if (!selectedSize) return;

    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    try {
      const res = await apiClient('/api/reservations', {
        method: 'POST',
        body: JSON.stringify({ productId: activeProduct.id, size: selectedSize })
      });
      
      if (res.success) {
        addToCart({
          productId: activeProduct.id,
          variantId: activeProduct.variants[0].id,
          size: selectedSize,
          price: activeProduct.price,
          quantity: 1,
          reservationId: res.reservationId,
          expiresAt: res.expiresAt,
          serverTime: res.serverTime,
          image: getSafeImage(activeProduct.images[0]),
          title: activeProduct.title,
          brand: activeProduct.brand
        } as Parameters<typeof addToCart>[0]);
        setView('checkout');
      }
    } catch (err: unknown) {
      if ((err as { status?: number }).status === 409 && (err as { message?: string }).message?.includes('waitlist')) {
        fetchWaitlist();
        setView('waitlist');
        addToast((err as { message?: string }).message || 'No inventory available. Joined waitlist.', 'info');
      } else {
        addToast((err as { message?: string }).message || "Failed to reserve", 'error');
      }
    }
  };

  const handlePaymentSubmit = async () => {
    if (!cartItems[0] || dummyCard.trim() === '') {
      if (dummyCard.trim() === '') addToast("Please enter a dummy card number.", 'warning');
      return;
    }
    
    setIsCheckingOut(true);
    try {
      const res = await apiClient('/api/payments/simulate', {
        method: 'POST',
        body: JSON.stringify({ reservationId: cartItems[0].reservationId })
      });
      
      if (res.success) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#22c55e', '#000000', '#ffffff']
        });
        setCartItems([]);
        setView('success');
        addToast("Payment successful", 'success');
      }
    } catch (error: unknown) {
      addToast(`Checkout Failed: ${(error as { message?: string }).message || "Payment error"}`, 'error');
      if ((error as { message?: string }).message?.includes('expired')) {
        setView('product');
      }
    } finally {
      setIsCheckingOut(false);
    }
  };

  const activeWaitlist = waitlist.find(w => w.product?.title === activeProduct.title && w.product?.size === selectedSize);

  if (view === 'success') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-[#fcfcfc] animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-green-500/30">
          <Check className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-black mb-2">Order Successful!</h2>
        <p className="text-neutral-500 text-center text-sm max-w-xs mb-8">
          Your payment has been verified. We have secured your limited edition pair.
        </p>
        <button 
          onClick={() => setView('product')}
          className="px-8 py-3 bg-neutral-100 text-black font-semibold rounded-full hover:bg-neutral-200 transition-colors"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  if (view === 'waitlist') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-[#fcfcfc] animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-yellow-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-yellow-500/30">
          <Clock className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-black mb-2">You&apos;re on the Waitlist</h2>
        <p className="text-neutral-500 text-center text-sm max-w-xs mb-8">
          This item is currently sold out or fully reserved. 
        </p>
        {activeWaitlist && (
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 w-full mb-8 flex flex-col items-center">
            <span className="text-xs text-neutral-500 font-bold uppercase tracking-widest mb-2">Your Position</span>
            <span className="text-5xl font-black text-black">#{activeWaitlist.position}</span>
            <span className="text-xs text-neutral-400 mt-2">Size: {activeWaitlist.product?.size}</span>
          </div>
        )}
        <button 
          onClick={() => setView('product')}
          className="px-8 py-3 bg-neutral-100 text-black font-semibold rounded-full hover:bg-neutral-200 transition-colors"
        >
          Back to Product
        </button>
      </div>
    );
  }

  if (view === 'checkout') {
    const subtotal = cartItems[0]?.price || 0;
    const gst = Math.round(subtotal * 0.18);
    const deliveryCharge = 500;
    const finalTotal = subtotal + gst + deliveryCharge;
    
    return (
      <div className="w-full h-full flex flex-col p-6 pt-10 bg-[#fcfcfc] relative">
        <button onClick={() => setView('product')} className="absolute top-4 left-4 p-2 hover:bg-neutral-100 rounded-full transition-colors z-30">
          <ArrowLeft className="w-5 h-5 text-black" />
        </button>
        
        <h2 className="text-2xl font-bold mb-8 text-black mt-6">Order Summary</h2>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-56">
          <div className="flex gap-4 mb-4 border-b border-neutral-100 pb-4 last:border-0">
            <div className="w-20 h-20 bg-neutral-100 rounded-xl relative flex-shrink-0 flex items-center justify-center overflow-visible">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={getSafeImage(activeProduct.images[0])} className="w-[140%] -ml-[10%] h-auto object-contain mix-blend-multiply pointer-events-none" alt="item" />
            </div>
            <div className="flex flex-col justify-center w-full">
              <p className="font-bold text-black text-sm">{activeProduct.brand}</p>
              <p className="text-xs text-neutral-500 font-medium">{activeProduct.title}</p>
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs font-semibold text-black">Size: {selectedSize}</p>
                <p className="font-bold text-black">₹ {activeProduct.price.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-white p-4 rounded-xl border border-neutral-100 shadow-sm flex flex-col gap-3">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Subtotal</span>
              <span className="font-semibold text-black">₹ {subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">GST (18%)</span>
              <span className="font-semibold text-black">₹ {gst.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Delivery Charge</span>
              <span className="font-semibold text-black">₹ {deliveryCharge.toLocaleString('en-IN')}</span>
            </div>
            <div className="h-px w-full bg-neutral-100 my-1"></div>
            <div className="flex justify-between text-base">
              <span className="font-bold text-black">Total to Pay</span>
              <span className="font-black text-black text-lg">₹ {finalTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 bg-[#fcfcfc] border-t border-neutral-100 pt-4 pb-6 px-6 z-20">
           <h3 className="font-bold text-black mb-3 text-sm">Payment Details</h3>
           
           <div className="relative mb-4">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <CreditCard className="w-5 h-5 text-neutral-400" />
              </div>
              <input 
                type="text" 
                placeholder="Enter any dummy card number" 
                value={dummyCard}
                onChange={(e) => setDummyCard(e.target.value)}
                className="w-full h-12 pl-12 pr-4 bg-white border border-neutral-200 rounded-xl text-sm font-medium text-black placeholder:text-neutral-500 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all shadow-sm"
              />
           </div>
           
           <button 
             onClick={handlePaymentSubmit}
             disabled={isCheckingOut || timeLeft <= 0}
             className={`w-full h-14 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl
                ${(isCheckingOut || timeLeft <= 0) ? 'bg-neutral-400 cursor-not-allowed shadow-none' : 'bg-black hover:bg-neutral-800 shadow-black/20'}`}
           >
             {isCheckingOut ? 'Processing Payment...' : `Pay ₹ ${finalTotal.toLocaleString('en-IN')} (${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')})`}
           </button>
        </div>
      </div>
    );
  }

  // Find inventory for the selected size
  const productInventories = inventory.filter(inv => inv.productTitle === activeProduct.title);
  const isCompletelyOutOfStock = productInventories.length > 0 && productInventories.every(inv => inv.available <= 0);

  const selectedInventory = productInventories.find(inv => inv.size === selectedSize);
  const isAvailable = selectedInventory ? selectedInventory.available > 0 : false;

  return (
    <div className="w-full h-full flex flex-col relative pt-4 pb-24 overflow-y-auto custom-scrollbar px-2">
      
      {/* Product Gallery */}
      <div className="w-full relative flex items-center justify-center mb-6 mt-2 overflow-visible">
        <div className="w-[110%] ml-[-5%] flex items-center justify-center pointer-events-none">
          <Image 
            src={getSafeImage(activeProduct.images[activeImageIndex])} 
            alt={activeProduct.title}
            width={800}
            height={800}
            className="w-full h-auto object-contain mix-blend-multiply"
            priority={true}
            loading="eager"
          />
        </div>
      </div>
      
      {/* Pagination Dots */}
      <div className="flex justify-center gap-1.5 mb-8">
        {activeProduct.images.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveImageIndex(i)}
            className={`h-1.5 rounded-full transition-all ${activeImageIndex === i ? 'w-4 bg-black' : 'w-1.5 bg-neutral-300'}`}
          />
        ))}
      </div>

      {/* Title Group */}
      <div className="text-center mb-8">
        <h2 className="text-lg font-bold text-black">{activeProduct.brand}</h2>
        <p className="text-xs text-neutral-400 font-medium">{activeProduct.title}</p>
      </div>

      {/* Details Accordions */}
      <div className="flex flex-col gap-4 w-full">
        <AccordionSection title="Select Size" defaultOpen={true}>
          <div className="flex gap-2 justify-center sm:justify-start flex-wrap mt-1 pb-4">
            {activeProduct.sizes.slice(0, 5).map((size) => {
              const inv = inventory.find(i => i.productTitle === activeProduct.title && i.size === size);
              const available = inv ? inv.available : 0;
              return (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  disabled={available <= 0}
                  className={`w-12 h-10 rounded-xl text-xs font-semibold transition-all flex flex-col items-center justify-center border relative
                    ${available <= 0 
                      ? 'opacity-50 cursor-not-allowed bg-neutral-100 text-neutral-400 border-neutral-200' 
                      : selectedSize === size 
                        ? 'bg-[#24262b] text-white border-[#24262b] shadow-md' 
                        : 'bg-white text-neutral-600 border-neutral-200 hover:border-black hover:text-black hover:bg-neutral-50'
                    }`}
                >
                  {size}
                  {available <= 0 && <div className="absolute top-1/2 left-0 w-full h-[1px] bg-red-500 transform -translate-y-1/2 -rotate-45"></div>}
                </button>
              );
            })}
          </div>
        </AccordionSection>

        <AccordionSection title="Composition" defaultOpen={true}>
          <div className="grid grid-cols-3 gap-2 mt-1 pb-4">
            {activeProduct.composition.map((item, i) => (
              <div key={i} className="flex flex-col items-center justify-center p-3 rounded-2xl border border-neutral-100 bg-white shadow-sm">
                <span className="text-base font-bold text-black">{item.value}</span>
                <span className="text-[8px] text-neutral-400 tracking-wider mt-1 uppercase">{item.name}</span>
              </div>
            ))}
          </div>
        </AccordionSection>

        <AccordionSection title="Description" defaultOpen={true}>
          <p className="text-xs text-neutral-500 leading-relaxed mt-1 pr-4 pb-4">
            {activeProduct.description}
          </p>
        </AccordionSection>
      </div>

      {/* Sticky Buy / Waitlist Now */}
      <div className="fixed bottom-0 right-0 w-[25%] bg-gradient-to-t from-[#fcfcfc] via-[#fcfcfc] to-transparent pt-8 pb-6 px-6 z-20">
        <button
          onClick={handleAddToCartOrBuy}
          disabled={isCompletelyOutOfStock}
          className={`w-full h-14 text-white rounded-2xl shadow-xl font-bold flex items-center justify-center gap-3 transition-all shadow-black/20 
            ${isCompletelyOutOfStock ? 'bg-neutral-400 cursor-not-allowed shadow-none' : !isAvailable ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-[#1c1d21] hover:bg-black'}`}
        >
          {isCompletelyOutOfStock ? (
            <>
              <span>Out of Stock</span>
            </>
          ) : !isAvailable ? (
            <>
              <Clock className="w-5 h-5" />
              <span>Join Waitlist</span>
            </>
          ) : (
            <>
              <ShoppingBag className="w-5 h-5" />
              <span>₹ {activeProduct.price.toLocaleString('en-IN')} - Buy Now</span>
            </>
          )}
        </button>
      </div>

      {/* Custom Tailwind Authentication Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsAuthModalOpen(false)}
          ></div>
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 pb-0 flex flex-col gap-1 items-center mt-2">
              <div className="flex items-center justify-center w-12 h-12 bg-black text-white rounded-xl mb-3">
                <User className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-center text-black">
                {authMode === 'login' ? 'Login to Continue' : 'Create an Account'}
              </h3>
              <p className="text-sm text-neutral-500 text-center font-normal">
                {authMode === 'login' ? 'Please authenticate to proceed.' : 'Register to join the drop.'}
              </p>
            </div>
            
            <div className="flex justify-center mt-4">
              <div className="bg-neutral-100 p-1 rounded-xl flex gap-1">
                <button 
                  onClick={() => setAuthMode('login')} 
                  className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${authMode === 'login' ? 'bg-white text-black shadow-sm' : 'text-neutral-500'}`}
                >
                  Login
                </button>
                <button 
                  onClick={() => setAuthMode('register')} 
                  className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${authMode === 'register' ? 'bg-white text-black shadow-sm' : 'text-neutral-500'}`}
                >
                  Register
                </button>
              </div>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-black px-1">Username</label>
                <input
                  autoFocus
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full h-12 px-4 bg-white border border-neutral-200 rounded-xl text-sm font-medium text-black placeholder:text-neutral-700 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all shadow-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-black px-1">Password</label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 px-4 bg-white border border-neutral-200 rounded-xl text-sm font-medium text-black placeholder:text-neutral-700 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all shadow-sm"
                />
              </div>
            </div>
            <div className="p-6 pt-2 flex gap-3">
              <button 
                onClick={() => setIsAuthModalOpen(false)}
                className="flex-1 h-12 bg-neutral-100 hover:bg-neutral-200 text-black font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleAuth}
                className="flex-1 h-12 bg-black hover:bg-neutral-800 text-white font-bold rounded-xl transition-colors shadow-lg shadow-black/20"
              >
                {authMode === 'login' ? 'Login' : 'Register'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function AccordionSection({ title, defaultOpen, children }: { title: string, defaultOpen: boolean, children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="flex flex-col">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between py-2 text-sm font-semibold text-black w-full"
      >
        {title}
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {isOpen && children}
    </div>
  );
}

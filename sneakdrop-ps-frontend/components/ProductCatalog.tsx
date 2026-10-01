"use client";

import React, { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { useStore } from "../store/StoreContext";
import { Product } from "../data/mock";
import Image from "next/image";
import { getSafeImage } from "../utils/format";

export function ProductCatalog() {
  const { setActiveProductId, activeProductId, products } = useStore();

  return (
    <div className="w-full h-full flex flex-col pt-6 pb-12 overflow-y-auto custom-scrollbar pr-4">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-bold text-black">New Arrivals</h2>
        
        <div className="relative inline-block text-left">
          <SortDropdown />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
        {products.map((product) => (
          <ProductCard 
            key={product.id} 
            product={product} 
            isActive={activeProductId === product.id}
            onClick={() => setActiveProductId(product.id)}
          />
        ))}
      </div>
    </div>
  );
}

function ProductCard({ product, isActive, onClick }: { product: Product, isActive: boolean, onClick: () => void }) {
  const [isHovered, setIsHovered] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeVariantId, setActiveVariantId] = useState(product.variants[0].id);

  // Auto-slide images on hover
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isHovered) {
      interval = setInterval(() => {
        setActiveImageIndex((prev) => (prev + 1) % product.images.length);
      }, 1200);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveImageIndex(0);
    }
    return () => clearInterval(interval);
  }, [isHovered, product.images.length]);

  return (
    <div 
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative group bg-white rounded-3xl p-5 cursor-pointer transition-all duration-300 border
        ${isActive ? 'border-neutral-300 shadow-md scale-[1.01]' : 'border-neutral-100 shadow-sm hover:shadow-md hover:border-neutral-200'}
      `}
    >
      {/* Accent Line */}
      <div className={`absolute top-6 left-0 w-1 h-6 rounded-r-md ${product.statusColor}`}></div>

      {/* Card Header */}
      <div className="ml-2 mb-2">
        <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider mb-0.5">{product.title}</p>
        <h3 className="text-sm font-bold text-black">{product.brand}</h3>
      </div>

      {/* Product Image Area */}
      <div className="w-full h-44 relative flex items-center justify-center my-4 overflow-hidden rounded-xl">
        <Image 
          src={getSafeImage(product.images[activeImageIndex])} 
          alt={product.title}
          fill
          className={`object-contain p-2 transition-transform duration-700 ease-out ${isHovered ? 'scale-110 -rotate-3' : 'scale-100'}`}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority={true}
          loading="eager"
        />
      </div>

      {/* Card Footer */}
      <div className="flex items-end justify-between mt-auto">
        <div>
          <p className="text-[10px] text-neutral-400 font-medium mb-0.5">Price</p>
          <p className="text-sm font-bold text-black">
            ₹ {product.price.toLocaleString('en-IN')}
          </p>
        </div>
        
        {/* Swatches */}
        <div className="flex gap-2">
          {product.variants.map((v) => (
            <button 
              key={v.id}
              onClick={(e) => {
                e.stopPropagation();
                setActiveVariantId(v.id);
                onClick();
              }}
              className={`w-9 h-9 rounded-lg border flex items-center justify-center bg-white overflow-hidden p-1 transition-colors
                ${activeVariantId === v.id ? 'border-black' : 'border-neutral-200 hover:border-neutral-300'}
              `}
            >
              <div className="relative w-full h-full">
                <Image src={getSafeImage(v.thumbnail)} alt="variant" fill className="object-contain" sizes="36px" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SortDropdown() {
  const { sortBy, setSortBy } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const options = ["Sort by Price", "Newest", "Featured"];

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        className="flex items-center gap-2 text-sm font-semibold text-black hover:opacity-70 transition-opacity px-4 py-2 bg-white border border-neutral-100 rounded-xl shadow-sm"
      >
        {sortBy} <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-neutral-100 rounded-xl shadow-xl overflow-hidden z-30">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => {
                setSortBy(option);
                setIsOpen(false);
              }}
              className={`block w-full text-left px-4 py-3 text-sm transition-colors
                ${sortBy === option ? 'bg-black text-white font-semibold' : 'text-neutral-600 hover:bg-neutral-50 hover:text-black'}`}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

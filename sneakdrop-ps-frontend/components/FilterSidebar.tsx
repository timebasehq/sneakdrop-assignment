"use client";

import React, { useState } from "react";
import { Lightbulb, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { useStore } from "../store/StoreContext";

const CATEGORIES = ["Flip Flops", "Sneakers", "Lace-Up Shoes", "Shoe Accessories"];
const SIZES = Array.from({ length: 15 }, (_, i) => i + 35); // 35 to 49

export function FilterSidebar() {
  const { selectedCategories, toggleCategory, priceRange, setPriceRange, selectedSizes, toggleSize } = useStore();

  const [categoriesOpen, setCategoriesOpen] = useState(true);

  return (
    <aside className="w-full h-full flex flex-col gap-6 pr-6 pb-8 overflow-y-auto custom-scrollbar">
      
      {/* Categories Accordion */}
      <div className="w-full">
        <div className="flex flex-col">
          <button 
            onClick={() => setCategoriesOpen(!categoriesOpen)}
            className="flex items-center justify-between py-3 text-sm font-semibold text-black w-full"
          >
            Categories
            {categoriesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {categoriesOpen && (
            <div className="flex flex-col gap-3 mt-1 pb-4">
              {CATEGORIES.map((cat) => (
                <label key={cat} className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${selectedCategories.includes(cat) ? 'bg-black border-black' : 'border-neutral-300 bg-white group-hover:border-neutral-400'}`}>
                    {selectedCategories.includes(cat) && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <span className={`text-sm ${selectedCategories.includes(cat) ? 'text-black font-medium' : 'text-neutral-500'}`}>
                    {cat}
                  </span>
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={selectedCategories.includes(cat)}
                    onChange={() => toggleCategory(cat)}
                  />
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Price Range */}
      <div className="mt-2">
        <h3 className="text-sm font-semibold text-black mb-4">Price Range</h3>
        
        {/* Fake Histogram */}
        <div className="flex items-end h-8 gap-[2px] mb-[-12px] px-2 z-0 relative opacity-40">
           {[30, 50, 40, 70, 90, 60, 40, 80, 100, 70, 50, 30, 40, 20].map((h, i) => (
             <div key={i} className="flex-1 bg-neutral-300 rounded-t-sm" style={{ height: `${h}%` }}></div>
           ))}
        </div>

        <div className="relative w-full mt-4 mb-2">
          <input 
            type="range"
            min="5000"
            max="150000"
            step="1000"
            value={priceRange[1]}
            onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
            className="w-full h-1 bg-neutral-200 rounded-full appearance-none outline-none accent-black"
          />
        </div>
        <div className="flex justify-between items-center mt-3 text-xs font-semibold text-black">
          <span>₹ {priceRange[0].toLocaleString('en-IN')}</span>
          <span>₹ {priceRange[1].toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* Size Grid */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-black mb-4">Size</h3>
        <div className="grid grid-cols-5 gap-2">
          {SIZES.map((size) => {
            const isSelected = selectedSizes.includes(size);
            return (
              <button
                key={size}
                onClick={() => toggleSize(size)}
                className={`h-10 rounded-xl text-xs font-medium transition-all flex items-center justify-center
                  ${isSelected 
                    ? 'bg-black text-white shadow-md shadow-black/20' 
                    : 'bg-white text-neutral-600 border border-neutral-200 hover:border-black hover:text-black hover:bg-neutral-50'
                  }`}
              >
                {size}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-grow"></div>

      {/* Promo Card */}
      <div className="mt-8 relative overflow-hidden bg-gradient-to-br from-[#1a1c20] to-[#0f1013] rounded-3xl p-6 text-white shadow-2xl shadow-black/20 flex flex-col gap-4 border border-white/5 group cursor-pointer transition-all duration-500 hover:-translate-y-1 hover:shadow-black/40 hover:border-white/10">
        {/* Dynamic Decorative blobs */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#30c2e3]/10 rounded-full blur-2xl group-hover:bg-[#30c2e3]/20 transition-colors duration-700"></div>
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-colors duration-700"></div>
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-white/5 backdrop-blur-xl flex items-center justify-center shadow-inner border border-white/10 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
            <Lightbulb className="w-6 h-6 text-orange-400 group-hover:text-orange-300 transition-colors duration-500" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-wide text-white/90 group-hover:text-white transition-colors duration-300">Help Center</span>
            <span className="text-[10px] text-[#30c2e3] font-bold uppercase tracking-widest mt-0.5">24/7 Support</span>
          </div>
        </div>
        
        <p className="text-xs text-neutral-400 leading-relaxed relative z-10 font-medium group-hover:text-neutral-300 transition-colors duration-300">
          Need assistance? Our sneaker experts are here to help you secure the perfect pair.
        </p>
        
        <div className="relative z-10 flex items-center gap-2 mt-1 text-xs font-bold text-white/80 group-hover:text-white transition-colors duration-300">
          <span>Get Help Now</span>
          <ArrowRight className="w-4 h-4 opacity-70 group-hover:opacity-100 group-hover:translate-x-1.5 transition-all duration-500" />
        </div>
      </div>
      
    </aside>
  );
}

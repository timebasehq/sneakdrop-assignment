"use client";

import React from "react";
import { Header } from "../components/Header";
import { FilterSidebar } from "../components/FilterSidebar";
import { ProductCatalog } from "../components/ProductCatalog";
import { ProductDetailPanel } from "../components/ProductDetailPanel";
import { StoreProvider } from "../store/StoreContext";

export default function Home() {
  return (
    <StoreProvider>
      <div className="min-h-screen flex flex-col bg-[#fcfcfc] overflow-hidden selection:bg-black selection:text-white">
        <Header />
        
        <main className="flex-1 flex overflow-hidden">
          <div className="w-full max-w-[1600px] mx-auto flex h-[calc(100vh-80px)]">
            
            {/* Left Column: Filter Sidebar (20%) */}
            <div className="hidden lg:block w-[20%] min-w-[240px] pl-8 py-6 border-r border-neutral-100">
              <FilterSidebar />
            </div>

            {/* Middle Column: Product Catalog (55%) */}
            <div className="flex-1 px-8 lg:px-12 bg-[#fcfcfc] relative">
              {/* Optional slight subtle shadow separation */}
              <div className="absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-neutral-100/30 to-transparent pointer-events-none"></div>
              <ProductCatalog />
            </div>

            {/* Right Column: Product Detail Panel (25%) */}
            <div className="hidden xl:block w-[28%] min-w-[320px] max-w-[380px] bg-white border-l border-neutral-100 relative">
               <ProductDetailPanel />
            </div>

          </div>
        </main>
      </div>
    </StoreProvider>
  );
}

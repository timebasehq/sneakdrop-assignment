"use client";

import React, { useState, useEffect } from "react";
import { Package, Users, Activity, Lock, RefreshCw, LogOut } from "lucide-react";
import { apiClient } from "../../lib/apiClient";
import { getSafeImage } from "../../utils/format";
import { useToast } from "../../components/ToastContext";

interface InventoryItem {
  id: string;
  size: number;
  total: number;
  reserved: number;
  sold: number;
  variant: {
    image: string;
    product: {
      title: string;
    };
  };
}

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTotal, setEditTotal] = useState<number>(0);

  const { addToast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await apiClient("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
      if (res.success && res.user.role === "ADMIN") {
        setIsAuthenticated(true);
      } else {
        setError("Invalid credentials or not an admin.");
      }
    } catch (err: unknown) {
      setError((err as { message?: string }).message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const checkAuth = async () => {
    try {
      const res = await apiClient("/api/auth/me");
      if (res.success && res.user.role === "ADMIN") {
        setIsAuthenticated(true);
      }
    } catch {
      setIsAuthenticated(false);
    }
  };

  const fetchInventory = async () => {
    try {
      const res = await apiClient("/api/admin/inventory");
      if (res.success) {
        setInventory(res.inventory);
      }
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) {
        setIsAuthenticated(false);
      } else {
        console.error("Failed to fetch admin inventory", err);
      }
    }
  };

  const handleUpdateStock = async (id: string) => {
    try {
      const res = await apiClient(`/api/admin/inventory/${id}`, {
        method: "PUT",
        body: JSON.stringify({ total: editTotal })
      });
      if (res.success) {
        setEditingId(null);
        fetchInventory();
        addToast("Stock updated successfully", 'success');
      } else {
        addToast(res.error || "Update failed", 'error');
      }
    } catch (err: unknown) {
      addToast((err as { message?: string }).message || "Update failed", 'error');
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkAuth();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInventory();
    const interval = setInterval(fetchInventory, 3000); // Polling every 3s
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleLogout = async () => {
    await apiClient("/api/auth/logout", { method: "POST" });
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center font-sans">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-xl w-96 flex flex-col gap-4">
          <div className="flex items-center justify-center w-12 h-12 bg-black text-white rounded-xl mx-auto mb-2">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-center text-black mb-4">Admin Access</h2>
          
          {error && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg text-center font-semibold">{error}</div>}
          
          <input 
            type="text" 
            placeholder="Admin ID" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:border-black text-sm text-black"
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:border-black text-sm text-black"
          />
          <button type="submit" disabled={loading} className="w-full mt-2 bg-black text-white font-semibold py-3 rounded-xl hover:bg-neutral-800 transition-colors">
            {loading ? "Authenticating..." : "Access Dashboard"}
          </button>
        </form>
      </div>
    );
  }

  const totalStock = inventory.reduce((acc, curr) => acc + curr.total, 0);
  const totalAvailable = inventory.reduce((acc, curr) => acc + (curr.total - curr.sold - curr.reserved), 0);
  const totalSold = inventory.reduce((acc, curr) => acc + curr.sold, 0);
  const totalReserved = inventory.reduce((acc, curr) => acc + curr.reserved, 0);

  return (
    <div className="min-h-screen bg-neutral-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-black">Hype Drop Control Center</h1>
            <p className="text-sm text-neutral-500">Live monitoring for limited edition release</p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={fetchInventory} className="p-2 bg-white border border-neutral-200 rounded-full hover:bg-neutral-50 transition-colors">
              <RefreshCw className="w-4 h-4 text-neutral-600" />
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-full hover:bg-neutral-50 transition-colors text-sm font-semibold text-neutral-600">
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
            <div className="px-4 py-2 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              SYSTEM LIVE
            </div>
          </div>
        </header>

        <div className="grid grid-cols-4 gap-6 mb-8">
          {/* Total Stock */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 flex flex-col gap-2">
            <div className="flex items-center gap-3 text-neutral-500 mb-2">
              <Package className="w-5 h-5" />
              <span className="text-sm font-semibold uppercase tracking-wider">Total Inventory</span>
            </div>
            <div className="text-5xl font-black text-black">
              {totalStock}
            </div>
          </div>

          {/* Available Stock */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 flex flex-col gap-2">
            <div className="flex items-center gap-3 text-neutral-500 mb-2">
              <Activity className="w-5 h-5 text-green-500" />
              <span className="text-sm font-semibold uppercase tracking-wider">Available</span>
            </div>
            <div className="text-5xl font-black text-green-500">
              {totalAvailable}
            </div>
          </div>

          {/* Reserved Stock */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 flex flex-col gap-2">
            <div className="flex items-center gap-3 text-neutral-500 mb-2">
              <Activity className="w-5 h-5 text-yellow-500" />
              <span className="text-sm font-semibold uppercase tracking-wider">Reserved</span>
            </div>
            <div className="text-5xl font-black text-yellow-500">
              {totalReserved}
            </div>
          </div>

          {/* Sold Stock */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 flex flex-col gap-2">
            <div className="flex items-center gap-3 text-neutral-500 mb-2">
              <Users className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-semibold uppercase tracking-wider">Sold Orders</span>
            </div>
            <div className="text-5xl font-black text-blue-600">
              {totalSold}
            </div>
          </div>
        </div>

        {/* Live Order Feed */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 bg-white">
            <h3 className="font-semibold text-black">Inventory Management</h3>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-neutral-50 text-neutral-500 font-semibold text-xs uppercase">
                <tr>
                  <th className="px-6 py-3">Product</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Available</th>
                  <th className="px-4 py-3">Reserved</th>
                  <th className="px-4 py-3">Sold</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((inv) => (
                  <tr key={inv.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-3 flex items-center gap-3">
                      <div className="w-10 h-10 bg-neutral-100 rounded flex items-center justify-center overflow-hidden relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={getSafeImage(inv.variant.image)} alt="Sneaker" className="w-full h-full object-cover mix-blend-multiply" />
                      </div>
                      <span className="font-medium text-black">{inv.variant.product.title}</span>
                    </td>
                    <td className="px-4 py-3 text-black font-semibold">{inv.size}</td>
                    <td className="px-4 py-3 text-black font-medium">
                      {editingId === inv.id ? (
                        <input 
                          type="number" 
                          value={editTotal} 
                          onChange={(e) => setEditTotal(Number(e.target.value))} 
                          className="w-20 px-2 py-1 border border-neutral-300 rounded outline-none"
                        />
                      ) : (
                        inv.total
                      )}
                    </td>
                    <td className="px-4 py-3 text-green-600 font-bold">{inv.total - inv.reserved - inv.sold}</td>
                    <td className="px-4 py-3 text-yellow-600 font-bold">{inv.reserved}</td>
                    <td className="px-4 py-3 text-blue-600 font-bold">{inv.sold}</td>
                    <td className="px-6 py-3 text-right">
                      {editingId === inv.id ? (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingId(null)} className="text-neutral-500 hover:text-black font-medium transition-colors">Cancel</button>
                          <button onClick={() => handleUpdateStock(inv.id)} className="text-green-600 hover:text-green-700 font-bold transition-colors">Save</button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingId(inv.id); setEditTotal(inv.total); }} className="text-neutral-500 hover:text-black font-medium transition-colors">Edit Total</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
      </div>
    </div>
  );
}

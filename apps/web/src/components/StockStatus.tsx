'use client';

import React from 'react';
import { InventoryStatus } from '@sneakdrop/shared';

interface Props {
  status: InventoryStatus | null;
}

export const StockStatus: React.FC<Props> = ({ status }) => {
  if (!status) {
    return <div className="text-gray-500 animate-pulse">Loading stock status...</div>;
  }

  const isSoldOut = status.availableStock === 0 && status.reservedStock === 0;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Inventory Status</span>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white">
            Pairs remaining: <span className={status.availableStock > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>{status.availableStock}</span>
            <span className="text-sm font-normal text-gray-500 ml-1">/ {status.totalStock}</span>
          </h2>
        </div>
        {isSoldOut ? (
          <span className="px-3 py-1 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 text-xs font-bold rounded-full">
            SOLD OUT
          </span>
        ) : (
          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs font-bold rounded-full">
            LIVE DROP
          </span>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <div className="bg-gray-50 dark:bg-gray-900/50 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700">
          <div className="text-gray-400 font-medium">Available</div>
          <div className="text-lg font-bold text-gray-800 dark:text-gray-200">{status.availableStock}</div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800/40">
          <div className="text-amber-600 dark:text-amber-400 font-medium">On Hold</div>
          <div className="text-lg font-bold text-amber-700 dark:text-amber-300">{status.reservedStock}</div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-950/30 p-2.5 rounded-lg border border-blue-200 dark:border-blue-800/40">
          <div className="text-blue-600 dark:text-blue-400 font-medium">Sold</div>
          <div className="text-lg font-bold text-blue-700 dark:text-blue-300">{status.soldStock}</div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-950/30 p-2.5 rounded-lg border border-purple-200 dark:border-purple-800/40">
          <div className="text-purple-600 dark:text-purple-400 font-medium">In Queue</div>
          <div className="text-lg font-bold text-purple-700 dark:text-purple-300">{status.waitingQueueCount}</div>
        </div>
      </div>
    </div>
  );
};

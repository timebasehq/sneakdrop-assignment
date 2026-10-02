'use client';

import React from 'react';
import { OrderInfo, OrderStatus } from '@sneakdrop/shared';

interface Props {
  orders: OrderInfo[];
  onSimulatePayment: (type: 'normal' | 'duplicate' | 'delayed' | 'failure') => void;
  hasActiveHold: boolean;
  isProcessing: boolean;
}

export const PaymentStatus: React.FC<Props> = ({
  orders,
  onSimulatePayment,
  hasActiveHold,
  isProcessing,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
          Payment & Event Simulator
        </h3>
        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 rounded font-mono">
          Testing Tools
        </span>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Test how the system handles unreliable real-world payment events (idempotency, duplicates, delays):
      </p>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => onSimulatePayment('normal')}
          disabled={!hasActiveHold || isProcessing}
          className="p-2.5 bg-gray-50 hover:bg-emerald-50 dark:bg-gray-900/50 dark:hover:bg-emerald-950/30 border border-gray-200 dark:border-gray-700 hover:border-emerald-400 rounded-lg text-left text-xs disabled:opacity-40 transition-all"
        >
          <div className="font-bold text-gray-900 dark:text-gray-100">Standard Success</div>
          <div className="text-[10px] text-gray-500">Normal 200 OK webhook</div>
        </button>

        <button
          onClick={() => onSimulatePayment('duplicate')}
          disabled={!hasActiveHold || isProcessing}
          className="p-2.5 bg-gray-50 hover:bg-blue-50 dark:bg-gray-900/50 dark:hover:bg-blue-950/30 border border-gray-200 dark:border-gray-700 hover:border-blue-400 rounded-lg text-left text-xs disabled:opacity-40 transition-all"
        >
          <div className="font-bold text-gray-900 dark:text-gray-100">Duplicate Webhook</div>
          <div className="text-[10px] text-gray-500">Tests idempotency replay</div>
        </button>

        <button
          onClick={() => onSimulatePayment('delayed')}
          disabled={!hasActiveHold || isProcessing}
          className="p-2.5 bg-gray-50 hover:bg-amber-50 dark:bg-gray-900/50 dark:hover:bg-amber-950/30 border border-gray-200 dark:border-gray-700 hover:border-amber-400 rounded-lg text-left text-xs disabled:opacity-40 transition-all"
        >
          <div className="font-bold text-gray-900 dark:text-gray-100">Delayed Event (3s)</div>
          <div className="text-[10px] text-gray-500">Simulates network latency</div>
        </button>

        <button
          onClick={() => onSimulatePayment('failure')}
          disabled={!hasActiveHold || isProcessing}
          className="p-2.5 bg-gray-50 hover:bg-red-50 dark:bg-gray-900/50 dark:hover:bg-red-950/30 border border-gray-200 dark:border-gray-700 hover:border-red-400 rounded-lg text-left text-xs disabled:opacity-40 transition-all"
        >
          <div className="font-bold text-gray-900 dark:text-gray-100">Failed Payment</div>
          <div className="text-[10px] text-gray-500">Releases hold to queue</div>
        </button>
      </div>

      {/* Orders List */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Order History</h4>
        {orders.length === 0 ? (
          <div className="text-xs text-gray-400 py-2 italic text-center">No orders placed yet</div>
        ) : (
          <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
            {orders.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700 text-xs"
              >
                <div>
                  <div className="font-mono font-medium text-gray-800 dark:text-gray-200">
                    Order #{o.id.slice(0, 8)}
                  </div>
                  <div className="text-[10px] text-gray-500">
                    {new Date(o.createdAt).toLocaleTimeString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-700 dark:text-gray-300">${o.amount.toFixed(2)}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      o.status === OrderStatus.PAID
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : o.status === OrderStatus.PENDING
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                    }`}
                  >
                    {o.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

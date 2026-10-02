'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  InventoryStatus,
  UserStateResponse,
  SNEAKER_NAME,
  SNEAKER_PRICE,
} from '@sneakdrop/shared';
import * as api from '../lib/api';
import { StockStatus } from './StockStatus';
import { HoldCountdown } from './HoldCountdown';
import { QueuePosition } from './QueuePosition';
import { PaymentStatus } from './PaymentStatus';

const DEMO_USERS = [
  { id: 'user_1', name: 'User 1 (Alice)' },
  { id: 'user_2', name: 'User 2 (Bob)' },
  { id: 'user_3', name: 'User 3 (Charlie)' },
  { id: 'user_4', name: 'User 4 (Diana)' },
  { id: 'user_5', name: 'User 5 (Evan)' },
];

export const SneakerDrop: React.FC = () => {
  const [selectedUserId, setSelectedUserId] = useState<string>('user_1');
  const [inventory, setInventory] = useState<InventoryStatus | null>(null);
  const [userState, setUserState] = useState<UserStateResponse | null>(null);
  const [loadingAction, setLoadingAction] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const refreshData = useCallback(async () => {
    try {
      const [inv, user] = await Promise.all([
        api.getInventoryStatus(),
        api.getUserState(selectedUserId),
      ]);
      setInventory(inv);
      setUserState(user);
    } catch (err: any) {
      console.error('Error refreshing state:', err);
    }
  }, [selectedUserId]);

  // Polling for real-time live synchronization
  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 1500);
    return () => clearInterval(interval);
  }, [refreshData]);

  // Handle Buy / Hold
  const handleBuyClick = async () => {
    setLoadingAction(true);
    try {
      const res = await api.requestHold(selectedUserId);
      if (res.success) {
        showToast('Pair reserved! You have 5 minutes to complete payment.', 'success');
      } else if (res.queued) {
        showToast(`Stock held/sold out. You joined the queue at position #${res.queuePosition}.`, 'info');
      }
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'Failed to request hold', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  // Handle Cancel Hold
  const handleCancelHold = async () => {
    if (!userState?.activeHold) return;
    setLoadingAction(true);
    try {
      await api.cancelHold(userState.activeHold.id, selectedUserId);
      showToast('Hold cancelled. Pair released to next person.', 'info');
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel hold', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  // Handle Leave Queue
  const handleLeaveQueue = async () => {
    setLoadingAction(true);
    try {
      await api.leaveQueue(selectedUserId);
      showToast('You left the waiting queue.', 'info');
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'Failed to leave queue', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  // Handle Simulated Payment
  const handlePaymentSimulation = async (type: 'normal' | 'duplicate' | 'delayed' | 'failure') => {
    if (!userState?.activeHold) return;
    setLoadingAction(true);
    try {
      const res = await api.processPayment({
        userId: selectedUserId,
        reservationId: userState.activeHold.id,
        simulateFailure: type === 'failure',
        simulateDelayMs: type === 'delayed' ? 3000 : 0,
        duplicate: type === 'duplicate',
      });

      if (res.success) {
        showToast(
          type === 'duplicate'
            ? 'Payment confirmed & duplicate webhook safely deduplicated!'
            : 'Payment successful! Order completed.',
          'success'
        );
      } else {
        showToast(res.message || 'Payment failed.', 'error');
      }
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'Payment simulation failed', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  // Handle Reset All Inventory
  const handleResetInventory = async () => {
    try {
      await api.resetInventory(20);
      showToast('Inventory reset to 20 pairs and state cleared.', 'success');
      await refreshData();
    } catch (err: any) {
      showToast('Failed to reset inventory', 'error');
    }
  };

  const hasMaxPurchases = (userState?.purchasedCount ?? 0) >= 2;
  const hasActiveHold = !!userState?.activeHold;
  const isInQueue = !!userState?.queueEntry;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg border text-sm font-medium transition-all transform translate-y-0 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950 dark:border-emerald-700 dark:text-emerald-100'
              : toastMessage.type === 'error'
              ? 'bg-red-50 border-red-300 text-red-900 dark:bg-red-950 dark:border-red-700 dark:text-red-100'
              : 'bg-blue-50 border-blue-300 text-blue-900 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-100'
          }`}
        >
          {toastMessage.text}
        </div>
      )}

      {/* Header & User Switcher */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
            SNEAKDROP
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            High-Concurrency Limited Sneaker Drop System
          </p>
        </div>

        {/* User Switcher Bar */}
        <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900 p-2 rounded-xl border border-gray-200 dark:border-gray-700">
          <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
            Active User:
          </label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
          >
            {DEMO_USERS.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <div className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300 font-medium">
            Bought: {userState?.purchasedCount ?? 0} / 2
          </div>
        </div>
      </div>

      {/* Inventory & Stock Status */}
      <StockStatus status={inventory} />

      {/* Main Drop Card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Sneaker Graphic / Badge */}
          <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-850 rounded-xl p-8 flex flex-col items-center justify-center border border-gray-200 dark:border-gray-700">
            <div className="text-7xl mb-4">👟</div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white text-center">
              {SNEAKER_NAME}
            </h3>
            <div className="text-2xl font-bold text-gray-700 dark:text-gray-300 mt-1">
              ${SNEAKER_PRICE.toFixed(2)}
            </div>
            <div className="mt-3 text-xs text-gray-500 text-center">
              Limited 20 Pair Drop &bull; Max 2 Per Customer &bull; 5-Min Hold
            </div>
          </div>

          {/* Action / State Area */}
          <div className="space-y-4">
            {hasActiveHold && userState?.activeHold ? (
              <HoldCountdown
                reservation={userState.activeHold}
                onCancel={handleCancelHold}
                onPay={() => handlePaymentSimulation('normal')}
                isPaying={loadingAction}
              />
            ) : isInQueue && userState?.queueEntry ? (
              <QueuePosition
                queueEntry={userState.queueEntry}
                onLeave={handleLeaveQueue}
                isLeaving={loadingAction}
              />
            ) : (
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 text-sm">
                  <div className="font-semibold text-gray-900 dark:text-white mb-1">
                    Drop Rules:
                  </div>
                  <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                    <li>Clicking BUY holds 1 pair for 5 minutes.</li>
                    <li>If stock is exhausted, you automatically join the FIFO queue.</li>
                    <li>When an active hold expires, the next queued user gets the pair.</li>
                    <li>Maximum 2 purchases per account.</li>
                  </ul>
                </div>

                <button
                  onClick={handleBuyClick}
                  disabled={loadingAction || hasMaxPurchases}
                  className="w-full py-4 px-6 bg-black hover:bg-gray-800 disabled:bg-gray-300 dark:bg-white dark:hover:bg-gray-100 dark:disabled:bg-gray-700 text-white dark:text-black dark:disabled:text-gray-500 font-black text-lg rounded-xl shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  {loadingAction ? (
                    <span>Processing...</span>
                  ) : hasMaxPurchases ? (
                    <span>Purchase Limit Reached (2 / 2)</span>
                  ) : (
                    <span>BUY NOW</span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment & Simulation Panel */}
      <PaymentStatus
        orders={userState?.orders || []}
        onSimulatePayment={handlePaymentSimulation}
        hasActiveHold={hasActiveHold}
        isProcessing={loadingAction}
      />

      {/* Admin / Demo Tools */}
      <div className="flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 text-xs">
        <span className="text-gray-500 dark:text-gray-400 font-medium">
          Demonstration / Reviewer Controls
        </span>
        <button
          onClick={handleResetInventory}
          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all"
        >
          Reset Inventory to 20 Pairs
        </button>
      </div>
    </div>
  );
};

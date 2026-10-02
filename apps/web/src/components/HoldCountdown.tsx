'use client';

import React, { useEffect, useState } from 'react';
import { ReservationInfo } from '@sneakdrop/shared';

interface Props {
  reservation: ReservationInfo;
  onCancel: () => void;
  onPay: () => void;
  isPaying?: boolean;
}

export const HoldCountdown: React.FC<Props> = ({ reservation, onCancel, onPay, isPaying }) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const expiry = new Date(reservation.expiresAt).getTime();
    return Math.max(0, Math.floor((expiry - Date.now()) / 1000));
  });

  useEffect(() => {
    const updateCountdown = () => {
      const expiry = new Date(reservation.expiresAt).getTime();
      const remaining = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [reservation.expiresAt]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const percent = Math.min(100, Math.max(0, (secondsLeft / 300) * 100));

  if (secondsLeft <= 0) {
    return (
      <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl p-5 text-center">
        <h3 className="text-red-700 dark:text-red-400 font-bold text-lg">Your hold has expired!</h3>
        <p className="text-sm text-red-600 dark:text-red-300 mt-1">
          The 5-minute hold limit was reached. The pair has been released to the next person in line.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-500/50 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
            Hold Active
          </span>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">5-minute window</span>
      </div>

      <div className="my-3 text-center">
        <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">Your hold:</div>
        <div className="text-4xl font-mono font-black text-gray-900 dark:text-white tracking-wider">
          {formattedTime}
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1.5">remaining</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-emerald-200/60 dark:bg-emerald-900/60 h-2 rounded-full overflow-hidden mb-4">
        <div
          className="bg-emerald-500 h-full transition-all duration-1000 ease-linear rounded-full"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={onPay}
          disabled={isPaying || secondsLeft <= 0}
          className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
        >
          {isPaying ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span>Processing Payment...</span>
            </>
          ) : (
            <span>Pay Now ($180.00)</span>
          )}
        </button>

        <button
          onClick={onCancel}
          disabled={isPaying}
          className="py-3 px-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-lg transition-all"
        >
          Cancel Hold
        </button>
      </div>
    </div>
  );
};

'use client';

import React from 'react';
import { QueueInfo } from '@sneakdrop/shared';

interface Props {
  queueEntry: QueueInfo;
  onLeave: () => void;
  isLeaving?: boolean;
}

export const QueuePosition: React.FC<Props> = ({ queueEntry, onLeave, isLeaving }) => {
  return (
    <div className="bg-purple-50 dark:bg-purple-950/30 border-2 border-purple-400/60 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300">
            Waiting Line Active
          </span>
        </div>
        <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">FIFO Queue</span>
      </div>

      <div className="my-3 text-center">
        <div className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">Queue position:</div>
        <div className="text-4xl font-mono font-black text-purple-900 dark:text-purple-200 tracking-tight">
          #{queueEntry.position}
          <span className="text-sm font-normal text-purple-600 dark:text-purple-400 ml-2">in line</span>
        </div>
      </div>

      <p className="text-xs text-purple-800 dark:text-purple-300 text-center mb-4 bg-purple-100/70 dark:bg-purple-900/40 p-2.5 rounded-lg border border-purple-200 dark:border-purple-800/60">
        ⚡ When someone&apos;s hold expires or is cancelled, the first person in line automatically gets that pair with a new 5-minute hold!
      </p>

      <button
        onClick={onLeave}
        disabled={isLeaving}
        className="w-full py-2.5 px-4 bg-purple-200 hover:bg-purple-300 dark:bg-purple-900/60 dark:hover:bg-purple-800 text-purple-900 dark:text-purple-200 text-sm font-bold rounded-lg transition-all"
      >
        {isLeaving ? 'Leaving Line...' : 'Leave Waiting Line'}
      </button>
    </div>
  );
};

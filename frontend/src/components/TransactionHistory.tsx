"use client";

import React, { useSyncExternalStore } from 'react';
import {
  getLiveSessionTxs,
  subscribeLiveSessionTxs,
  LiveSessionTx,
} from '@/lib/liveSessionHistory';
import { formatUtcTime } from '@/lib/utils';
import { History, ExternalLink, CheckCircle2, XCircle } from 'lucide-react';
import { EXPLORER_URL } from '@/lib/constants';

export function TransactionHistory() {
  const liveSessionTxs = useSyncExternalStore(
    subscribeLiveSessionTxs,
    getLiveSessionTxs,
    getLiveSessionTxs,
  );

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1E2229]">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-white tracking-tight">Execution Operations Log</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            LIVE
          </span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#181B20] text-gray-400 border border-[#2A303A]">
            {liveSessionTxs.length} tx{liveSessionTxs.length === 1 ? '' : 's'} this session
          </span>
        </div>
      </div>

      {liveSessionTxs.length === 0 ? (
        <div className="py-8 text-center text-xs text-gray-500 border border-dashed border-[#1E2229] rounded-lg">
          No indexed history available. (External subgraph/indexer required for cross-session queries). Live transactions submitted this session will appear here.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs data-table">
            <thead>
              <tr>
                <th>Tx Hash</th>
                <th>Action</th>
                <th>Asset</th>
                <th>Amount</th>
                <th>Status</th>
                <th className="text-right">Time (UTC)</th>
              </tr>
            </thead>
            <tbody>
              {liveSessionTxs.map((tx: LiveSessionTx, idx: number) => (
                <tr key={idx}>
                  <td className="font-mono text-gray-300">
                    <div className="flex items-center gap-1.5">
                      {tx.status === 'Confirmed' ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                      )}
                      <span>{tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}</span>
                      <a
                        href={`${EXPLORER_URL}/tx/${tx.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-500 hover:text-white"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </td>
                  <td className="font-mono text-gray-200">{tx.action}</td>
                  <td className="font-mono text-gray-300">{tx.asset}</td>
                  <td className="font-mono font-medium text-white">
                    ${(tx.amount || 0).toLocaleString()}
                  </td>
                  <td>
                    <span className={`badge ${tx.status === 'Confirmed' ? 'badge-green' : 'badge-red'}`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="text-right font-mono text-gray-400">
                    {formatUtcTime(tx.time)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

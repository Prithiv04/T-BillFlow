"use client";

import React from 'react';
import { mockTxHistory } from '@/mocks/data';
import { formatUtcTime } from '@/lib/utils';
import { History, ExternalLink, CheckCircle2 } from 'lucide-react';

export function TransactionHistory() {
  return (
    <div className="card-glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <History className="h-5 w-5 text-[#F0B90B]" />
          Execution Log
        </h2>
        <span className="text-xs text-gray-400">
          {mockTxHistory.length} transaction{mockTxHistory.length === 1 ? '' : 's'}
        </span>
      </div>

      {mockTxHistory.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-500 border border-dashed border-white/10 rounded-xl">
          No transactions executed yet in this session.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 text-xs text-gray-400">
              <tr>
                <th className="pb-2">Tx Hash</th>
                <th className="pb-2">Amount</th>
                <th className="pb-2">Status</th>
                <th className="pb-2 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {mockTxHistory.map((tx, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02]">
                  <td className="py-2.5 font-mono text-xs text-gray-300 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />
                    <span>{tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}</span>
                    <ExternalLink className="h-3 w-3 text-gray-500" />
                  </td>
                  <td className="py-2.5 font-mono text-xs text-white">
                    ${(tx.amount || 0).toLocaleString()}
                  </td>
                  <td className="py-2.5">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-2.5 text-right text-xs text-gray-400 font-mono">
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

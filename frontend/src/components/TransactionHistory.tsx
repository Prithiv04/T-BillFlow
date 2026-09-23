"use client";

import React from 'react';
import { mockTxHistory } from '@/mocks/data';
import { formatUtcTime } from '@/lib/utils';
import { History, ExternalLink, CheckCircle2 } from 'lucide-react';

export function TransactionHistory() {
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1E2229]">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-white tracking-tight">Execution Operations Log</h2>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#181B20] text-gray-400 border border-[#2A303A]">
          {mockTxHistory.length} transaction{mockTxHistory.length === 1 ? '' : 's'}
        </span>
      </div>

      {mockTxHistory.length === 0 ? (
        <div className="py-8 text-center text-xs text-gray-500 border border-dashed border-[#1E2229] rounded-lg">
          No transactions executed yet in this session.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs data-table">
            <thead>
              <tr>
                <th>Tx Hash</th>
                <th>Action</th>
                <th>Amount</th>
                <th>Gate Status</th>
                <th className="text-right">Time (UTC)</th>
              </tr>
            </thead>
            <tbody>
              {mockTxHistory.map((tx, idx) => (
                <tr key={idx}>
                  <td className="font-mono text-gray-300">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span>{tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}</span>
                      <a
                        href={`https://sepolia.arbiscan.io/tx/${tx.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-500 hover:text-white"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </td>
                  <td className="font-mono text-gray-200">DEPOSIT (USTB)</td>
                  <td className="font-mono font-medium text-white">
                    ${(tx.amount || 0).toLocaleString()}
                  </td>
                  <td>
                    <span className="badge badge-green">
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

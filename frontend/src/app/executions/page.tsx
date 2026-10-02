"use client";

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { History, CheckCircle2, ShieldAlert } from 'lucide-react';
import { getLiveSessionTxs, subscribeLiveSessionTxs } from '@/lib/liveSessionHistory';
import { formatUtcTime } from '@/lib/utils';
import { TechnicalDetailsDrawer } from '@/components/execution/TechnicalDetailsDrawer';

export default function ExecutionsPage() {
  const [selectedTx, setSelectedTx] = useState<string | null>(null);
  const [sessionTxs, setSessionTxs] = useState(getLiveSessionTxs());

  // Subscribe to live session tx updates
  useEffect(() => {
    const unsub = subscribeLiveSessionTxs(() => {
      setSessionTxs(getLiveSessionTxs());
    });
    return unsub;
  }, []);

  const liveTxRows = sessionTxs.map((tx) => ({
    hash: tx.hash,
    time: formatUtcTime(tx.time),
    action: tx.action,
    asset: tx.asset,
    amount: tx.amount,
    result: tx.status === 'Confirmed' ? 'SUCCESS' : 'BLOCKED',
    reason: tx.reason || 'All checks passed',
    block: 0,
    selector: '0x6e553f65 (deposit(uint256,address))',
  }));

  const allExecutions = liveTxRows;

  return (
    <AppShell
      title="Execution History & Audit Log"
      subtitle="Complete Ledger of Autonomous Agent Submissions, Verifications & Rejections"
    >
      <div className="panel p-5 mb-6">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1E2229]">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-white tracking-tight">
              Operations & Gate Decisions Audit Table
            </h2>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#181B20] text-gray-400 border border-[#2A303A]">
            {allExecutions.length} Events Logged
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs data-table">
            <thead>
              <tr>
                <th>Tx Identifier</th>
                <th>Time (UTC)</th>
                <th>Action</th>
                <th>Asset</th>
                <th>Amount</th>
                <th>Gate Result</th>
                <th>Audit Decision Reason</th>
                <th className="text-right">Inspection</th>
              </tr>
            </thead>
            <tbody>
              {allExecutions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500 font-mono text-xs">
                    No executions recorded in this session.
                    <span className="block mt-1 text-[11px] text-gray-600">
                      Transactions submitted via AgentExecutionGate will appear here in real time. Historical cross-session indexing requires an external indexer (TheGraph / Goldsky).
                    </span>
                  </td>
                </tr>
              ) : (
                allExecutions.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#14161A]">
                    <td className="font-mono text-gray-300">
                      <div className="flex items-center gap-1.5">
                        {item.result === 'SUCCESS' ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <ShieldAlert className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                        )}
                        <span>{item.hash.slice(0, 10)}...</span>
                      </div>
                    </td>
                    <td className="font-mono text-gray-400">{item.time}</td>
                    <td className="font-mono font-medium text-white">{item.action}</td>
                    <td className="font-mono text-gray-300">{item.asset}</td>
                    <td className="font-mono text-white font-medium">
                      ${item.amount.toLocaleString()}
                    </td>
                    <td>
                      <span
                        className={`badge font-mono text-[10px] ${
                          item.result === 'SUCCESS' ? 'badge-green' : 'badge-red'
                        }`}
                      >
                        {item.result}
                      </span>
                    </td>
                    <td className="text-gray-400 font-mono text-[11px]">{item.reason}</td>
                    <td className="text-right">
                      <button
                        onClick={() =>
                          setSelectedTx(selectedTx === item.hash ? null : item.hash)
                        }
                        className="px-2 py-1 rounded bg-[#181B20] hover:bg-[#20242B] border border-[#2A303A] text-[10px] font-mono text-blue-400 transition-colors"
                      >
                        {selectedTx === item.hash ? 'Hide' : 'Inspect'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expandable Technical Details Drawer */}
      {selectedTx && (() => {
        const selectedItem = allExecutions.find((i) => i.hash === selectedTx);
        return (
          <div className="mb-6">
            <TechnicalDetailsDrawer
              txHash={selectedTx}
              amount={selectedItem ? `${selectedItem.amount.toLocaleString()} ${selectedItem.asset}` : undefined}
              selector={selectedItem?.selector}
              action={selectedItem?.action}
            />
          </div>
        );
      })()}
    </AppShell>
  );
}

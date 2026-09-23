"use client";

import React from 'react';
import { mockMandate } from '@/mocks/data';
import { FileCheck2, CheckCircle2, ShieldX, KeyRound } from 'lucide-react';
import { ADDRESSES } from '@/config';

export function MandateCard() {
  const percentUsed =
    mockMandate.maxCumulative > 0
      ? Math.min(100, (mockMandate.used / mockMandate.maxCumulative) * 100)
      : 0;

  return (
    <div className="panel p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1E2229]">
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-white tracking-tight">Agent Mandate Registry</h2>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#181B20] text-gray-400 border border-[#2A303A]">
            AgentMandateRegistry.sol
          </span>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-2.5 rounded bg-[#0E1013] border border-[#1E2229]">
            <span className="text-gray-400">Designated Agent</span>
            <span className="font-mono text-gray-200">{mockMandate.agent}</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded bg-[#0E1013] border border-[#1E2229]">
            <span className="text-gray-400">Allowed Action</span>
            <span className="font-mono font-medium text-emerald-400">{mockMandate.allowedAction}</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded bg-[#0E1013] border border-[#1E2229]">
            <span className="text-gray-400">Per-Tx Limit</span>
            <span className="font-mono text-white">
              ${mockMandate.maxTx.toLocaleString()} tBUSD
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded bg-[#0E1013] border border-[#1E2229]">
            <span className="text-gray-400">Cumulative Budget</span>
            <span className="font-mono text-white">
              ${mockMandate.maxCumulative.toLocaleString()} tBUSD
            </span>
          </div>

          {/* Budget Utilized Progress */}
          <div className="p-2.5 rounded bg-[#0E1013] border border-[#1E2229] space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Budget Utilized:</span>
              <span className="font-mono font-medium text-white">
                ${mockMandate.used.toLocaleString()} ({percentUsed.toFixed(0)}%)
              </span>
            </div>
            <div className="w-full bg-[#181B20] h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  percentUsed >= 100
                    ? 'bg-rose-500'
                    : percentUsed > 75
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${percentUsed}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded bg-[#0E1013] border border-[#1E2229]">
            <span className="text-gray-400">Mandate Status</span>
            <span
              className={`inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded ${
                !mockMandate.revoked
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {!mockMandate.revoked ? (
                <>
                  <CheckCircle2 className="h-3 w-3" /> Active & Valid
                </>
              ) : (
                <>
                  <ShieldX className="h-3 w-3" /> Revoked
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-[#1E2229] mt-3 flex items-center justify-between text-[11px] text-gray-500 font-mono">
        <span className="flex items-center gap-1">
          <KeyRound className="h-3 w-3 text-blue-400" /> EIP-712 Nonce: 0
        </span>
        <span className="truncate max-w-[140px] text-gray-400">
          {ADDRESSES.registry.slice(0, 8)}...{ADDRESSES.registry.slice(-6)}
        </span>
      </div>
    </div>
  );
}

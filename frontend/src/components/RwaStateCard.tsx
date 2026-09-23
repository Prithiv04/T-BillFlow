"use client";

import React from 'react';
import { mockRwaState } from '@/mocks/data';
import { Database, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { formatUtcTime } from '@/lib/utils';
import { ADDRESSES } from '@/config';

export function RwaStateCard() {
  const isFresh = !mockRwaState.isStale;

  return (
    <div className="panel p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1E2229]">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white tracking-tight">RWA State Oracle</h2>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#181B20] text-gray-400 border border-[#2A303A]">
            RWAStateOracle.sol
          </span>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-2.5 rounded bg-[#0E1013] border border-[#1E2229]">
            <span className="text-gray-400">Target Asset</span>
            <span className="font-mono font-medium text-white">USTB (US Treasury 3M)</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded bg-[#0E1013] border border-[#1E2229]">
            <span className="text-gray-400">NAV Price</span>
            <span className="font-mono font-medium text-white">
              ${mockRwaState.nav.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded bg-[#0E1013] border border-[#1E2229]">
            <span className="text-gray-400">NAV Updated</span>
            <span className="font-mono text-gray-300">
              {formatUtcTime(mockRwaState.navUpdatedAt)}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded bg-[#0E1013] border border-[#1E2229]">
            <span className="text-gray-400">Freshness Status</span>
            <span
              className={`inline-flex items-center gap-1.5 font-medium px-2 py-0.5 rounded text-[11px] font-mono ${
                isFresh
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {isFresh ? (
                <>
                  <CheckCircle2 className="h-3 w-3" /> Fresh (&lt; 300s maxNavAge)
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3 w-3" /> Stale (&gt; 300s maxNavAge)
                </>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded bg-[#0E1013] border border-[#1E2229]">
            <span className="text-gray-400">Redemption Window</span>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium ${
                mockRwaState.redemptionOpen
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {mockRwaState.redemptionOpen ? 'OPEN' : 'CLOSED'}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded bg-[#0E1013] border border-[#1E2229]">
            <span className="text-gray-400">Liquidity Tier</span>
            <span className="font-mono text-gray-300">
              Tier {mockRwaState.liquidityTier} (Sufficient)
            </span>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-[#1E2229] mt-3 flex items-center justify-between text-[11px] text-gray-500 font-mono">
        <span>Oracle contract on Arbitrum</span>
        <span className="truncate max-w-[140px] text-gray-400">
          {ADDRESSES.oracle.slice(0, 8)}...{ADDRESSES.oracle.slice(-6)}
        </span>
      </div>
    </div>
  );
}

"use client";

import React from 'react';
import { mockRwaState } from '@/mocks/data';
import { formatUtcTime } from '@/lib/utils';
import { Activity, Clock, Layers, RefreshCw } from 'lucide-react';

export function RwaStateCard() {
  const navFresh = !mockRwaState.isStale;
  const navFreshLabel = navFresh ? 'Fresh (< 60s ago)' : 'Stale (> 300s maxNavAge)';
  const navFreshColor = navFresh ? 'text-green-400' : 'text-red-400 font-semibold';
  const redemptionLabel = mockRwaState.redemptionOpen ? 'Open' : 'Closed';
  const redemptionColor = mockRwaState.redemptionOpen ? 'text-green-400' : 'text-red-400 font-semibold';

  return (
    <div className="card-glass rounded-2xl p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-[#F0B90B]" />
            RWA State Oracle
          </h2>
          <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-gray-400 font-mono border border-white/10">
            RWAStateOracle.sol
          </span>
        </div>

        <div className="grid gap-3 text-sm">
          <div className="flex justify-between items-center py-1.5 border-b border-white/5">
            <span className="text-gray-400 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" /> NAV Price
            </span>
            <span className="font-mono font-bold text-white">${mockRwaState.nav.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-white/5">
            <span className="text-gray-400 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> NAV Updated
            </span>
            <span className="font-mono text-gray-300">
              {formatUtcTime(mockRwaState.navUpdatedAt)}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-white/5">
            <span className="text-gray-400 flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Freshness
            </span>
            <span className={`font-mono text-xs ${navFreshColor}`}>{navFreshLabel}</span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-white/5">
            <span className="text-gray-400">Redemption Window</span>
            <span className={`font-mono ${redemptionColor}`}>{redemptionLabel}</span>
          </div>

          <div className="flex justify-between items-center py-1.5">
            <span className="text-gray-400">Liquidity Tier</span>
            <span className="font-mono font-medium text-white">
              Tier {mockRwaState.liquidityTier} (Sufficient)
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-500">
        <span>Asset: USTB Simulated T-Bill</span>
        <span>Chain: Arbitrum Sepolia</span>
      </div>
    </div>
  );
}

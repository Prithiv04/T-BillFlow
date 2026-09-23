"use client";

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Database, CheckCircle2, AlertTriangle, RefreshCw, Sliders, ShieldCheck } from 'lucide-react';
import { mockRwaState, INITIAL_MOCK_TIME } from '@/mocks/data';
import { formatUtcTime } from '@/lib/utils';
import { useMode } from '@/context/ModeContext';

export default function RwaAssetsPage() {
  const { isDemo } = useMode();
  const [, setTick] = useState(0);

  const refresh = () => setTick((t) => t + 1);

  const toggleStale = () => {
    mockRwaState.isStale = !mockRwaState.isStale;
    if (mockRwaState.isStale) {
      mockRwaState.navUpdatedAt = INITIAL_MOCK_TIME - 360_000; // 6 mins ago
    } else {
      mockRwaState.navUpdatedAt = INITIAL_MOCK_TIME;
    }
    refresh();
  };

  const toggleRedemption = () => {
    mockRwaState.redemptionOpen = !mockRwaState.redemptionOpen;
    refresh();
  };

  const cycleTier = () => {
    mockRwaState.liquidityTier = (mockRwaState.liquidityTier % 3) + 1;
    refresh();
  };

  const isEligible = !mockRwaState.isStale && mockRwaState.redemptionOpen && mockRwaState.liquidityTier >= 1;

  return (
    <AppShell
      title="RWA State Oracle"
      subtitle="Real-World Asset NAV Freshness, Redemption Gates & Liquidity Tiers"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* RWA Assets Table */}
        <div className="panel lg:col-span-2 p-5">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1E2229]">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-white tracking-tight">
                Tracked Tokenized Real-World Assets
              </h2>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#181B20] text-gray-400 border border-[#2A303A]">
              RWAStateOracle.sol
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs data-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>NAV Price</th>
                  <th>Freshness Age</th>
                  <th>Redemption</th>
                  <th>Liquidity</th>
                  <th>Oracle Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-semibold text-white">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span>USTB</span>
                    </div>
                  </td>
                  <td className="font-mono text-white">${mockRwaState.nav.toFixed(2)}</td>
                  <td className="font-mono text-gray-300">
                    <span
                      className={`inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded ${
                        !mockRwaState.isStale
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {!mockRwaState.isStale ? '< 60s' : '> 300s (Stale)'}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`font-mono text-[10px] px-2 py-0.5 rounded ${
                        mockRwaState.redemptionOpen
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {mockRwaState.redemptionOpen ? 'OPEN' : 'CLOSED'}
                    </span>
                  </td>
                  <td className="font-mono text-gray-300">Tier {mockRwaState.liquidityTier}</td>
                  <td>
                    <span
                      className={`badge font-mono text-[10px] ${
                        isEligible ? 'badge-green' : 'badge-red'
                      }`}
                    >
                      {isEligible ? 'ELIGIBLE' : 'BLOCKED'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-3.5 rounded-lg bg-[#0E1013] border border-[#1E2229] mt-4 text-xs text-gray-400 space-y-1">
            <div className="font-medium text-gray-300">On-Chain Eligibility Rules:</div>
            <div className="text-[11px] font-mono text-gray-500">
              • Deposits require: Asset Supported + NAV Fresh (&lt;300s) + Liquidity Sufficient (&gt;=Tier 1)<br />
              • Redemptions require: Asset Supported + NAV Fresh + Redemption Window Open
            </div>
          </div>
        </div>

        {/* Oracle Simulation & State Controls */}
        <div className="panel p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1E2229]">
              <div className="flex items-center gap-1.5">
                <Sliders className="h-4 w-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-white tracking-tight">Oracle Simulation</h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#181B20] text-amber-400 border border-[#2A303A]">
                Demo Harness
              </span>
            </div>

            <p className="text-xs text-gray-400 mb-4">
              Directly manipulate simulated on-chain oracle conditions to evaluate how the Execution Gate reacts.
            </p>

            <div className="space-y-2.5">
              <button
                onClick={toggleStale}
                className="w-full p-2.5 rounded bg-[#0E1013] hover:bg-[#14161A] border border-[#1E2229] text-xs font-mono flex items-center justify-between text-gray-200 transition-colors"
              >
                <span>NAV Freshness:</span>
                <span
                  className={`px-2 py-0.5 rounded font-bold ${
                    !mockRwaState.isStale ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {!mockRwaState.isStale ? 'Toggle Stale' : 'Refresh NAV'}
                </span>
              </button>

              <button
                onClick={toggleRedemption}
                className="w-full p-2.5 rounded bg-[#0E1013] hover:bg-[#14161A] border border-[#1E2229] text-xs font-mono flex items-center justify-between text-gray-200 transition-colors"
              >
                <span>Redemption Window:</span>
                <span
                  className={`px-2 py-0.5 rounded font-bold ${
                    mockRwaState.redemptionOpen ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {mockRwaState.redemptionOpen ? 'Close Window' : 'Open Window'}
                </span>
              </button>

              <button
                onClick={cycleTier}
                className="w-full p-2.5 rounded bg-[#0E1013] hover:bg-[#14161A] border border-[#1E2229] text-xs font-mono flex items-center justify-between text-gray-200 transition-colors"
              >
                <span>Cycle Liquidity Tier:</span>
                <span className="font-bold text-blue-400">
                  Tier {mockRwaState.liquidityTier} →
                </span>
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-[#1E2229] mt-3 text-[11px] font-mono text-gray-500 flex items-center justify-between">
            <span>Last NAV Timestamp:</span>
            <span className="text-gray-400">{formatUtcTime(mockRwaState.navUpdatedAt)}</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

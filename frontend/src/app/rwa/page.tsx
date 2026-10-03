"use client";

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Database, CheckCircle2, AlertTriangle, RefreshCw, Sliders, ShieldCheck } from 'lucide-react';
import { useLiveRwaState } from '@/hooks/useLiveRwaState';
import { RWA_ORACLE_ADDRESS, TBUSD_ADDRESS, EXPLORER_URL } from '@/lib/constants';

export default function RwaAssetsPage() {
  const liveRwa = useLiveRwaState();
  const [, setTick] = useState(0);

  const refresh = () => setTick((t) => t + 1);

  const isLiveEligible = !liveRwa.isStale && liveRwa.redemptionOpen && liveRwa.liquidityTier >= 1;

  // ── Strict Display Derivation ───────────────────────────────────────────────
  const navPriceDisplay = liveRwa.isError
    ? 'Unavailable'
    : liveRwa.isLoading
    ? '...'
    : `$${(Number(liveRwa.nav) / 1e18).toFixed(4)}`;

  const freshnessDisplay = liveRwa.isError
    ? 'Unavailable'
    : liveRwa.isLoading
    ? '...'
    : `${liveRwa.navAgeSeconds}s ago (${liveRwa.isStale ? 'Stale' : 'Fresh'})`;

  const isFresh = !liveRwa.isStale;

  const redemptionDisplay = liveRwa.isError
    ? 'Unavailable'
    : liveRwa.isLoading
    ? '...'
    : liveRwa.redemptionOpen ? 'OPEN' : 'CLOSED';

  const isRedemptionOpen = liveRwa.redemptionOpen;

  const liquidityDisplay = liveRwa.isError
    ? 'Unavailable'
    : liveRwa.isLoading
    ? '...'
    : `Tier ${liveRwa.liquidityTier}`;

  const statusDisplay = liveRwa.isError
    ? 'UNAVAILABLE'
    : isLiveEligible ? 'ELIGIBLE' : 'BLOCKED';

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
                      <span>{TBUSD_ADDRESS.slice(0, 12)}... (testnet reserve)</span>
                    </div>
                  </td>
                  <td className="font-mono text-white">{navPriceDisplay}</td>
                  <td className="font-mono text-gray-300">
                    <span
                      className={`inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded ${
                        isFresh
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {freshnessDisplay}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`font-mono text-[10px] px-2 py-0.5 rounded ${
                        isRedemptionOpen
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {redemptionDisplay}
                    </span>
                  </td>
                  <td className="font-mono text-gray-300">{liquidityDisplay}</td>
                  <td>
                    <span
                      className={`badge font-mono text-[10px] ${
                        statusDisplay === 'ELIGIBLE'
                          ? 'badge-green'
                          : statusDisplay === 'BLOCKED'
                          ? 'badge-red'
                          : 'badge-neutral'
                      }`}
                    >
                      {statusDisplay}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-4 rounded-lg bg-[#0E1013] border border-[#1E2229] mt-5">
            <h4 className="text-xs font-semibold text-white mb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
              On-Chain Gate Invariant
            </h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Before the <code className="text-gray-300">AgentExecutionGate</code> permits any autonomous execution request, it calls <code className="text-gray-300">RWAStateOracle.isEligible(asset, action)</code>. If the NAV is stale (&gt;300s), redemption is closed, or liquidity tier &lt; 1, execution strictly reverts.
            </p>
          </div>
        </div>

        {/* Live Oracle Diagnostics */}
        <div className="panel p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1E2229]">
              <div className="flex items-center gap-1.5">
                <Sliders className="h-4 w-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-white tracking-tight">
                  Live Oracle Diagnostics
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                Arbitrum Sepolia
              </span>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <p className="text-gray-400 text-xs">
                Connected to real on-chain Oracle contract. Status is queried in real time via Arbitrum Sepolia RPC.
              </p>

              <div className="p-2.5 rounded bg-[#0E1013] border border-[#1E2229] space-y-1">
                <span className="text-gray-500 block text-[10px] uppercase">Contract Address</span>
                <a
                  href={`${EXPLORER_URL}/address/${RWA_ORACLE_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline text-[11px] break-all"
                >
                  {RWA_ORACLE_ADDRESS}
                </a>
              </div>

              <div className="p-2.5 rounded bg-[#0E1013] border border-[#1E2229] space-y-1">
                <span className="text-gray-500 block text-[10px] uppercase">Max NAV Age Threshold</span>
                <span className="text-white text-[11px]">
                  {liveRwa.isError ? 'Unavailable' : `${liveRwa.maxNavAge.toString()} seconds (${Number(liveRwa.maxNavAge) / 3600} hours)`}
                </span>
              </div>

              <div className="p-2.5 rounded bg-[#0E1013] border border-[#1E2229] space-y-1">
                <span className="text-gray-500 block text-[10px] uppercase">Last On-Chain Update</span>
                <span className="text-gray-300 text-[11px]">
                  {liveRwa.isError || liveRwa.navUpdatedAt === 0n
                    ? 'Unavailable'
                    : new Date(Number(liveRwa.navUpdatedAt) * 1000).toUTCString()}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#1E2229] mt-3 text-[11px] font-mono text-gray-500 flex items-center justify-between">
            <span>Last NAV Timestamp:</span>
            <span className="text-gray-400">
              {liveRwa.isError || liveRwa.navUpdatedAt === 0n
                ? 'Unavailable'
                : new Date(Number(liveRwa.navUpdatedAt) * 1000).toUTCString()}
            </span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

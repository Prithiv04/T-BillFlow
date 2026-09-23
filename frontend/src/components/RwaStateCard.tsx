'use client';

import React from 'react';
import { mockRwaState } from '@/mocks/data';
import { Database, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { formatUtcTime } from '@/lib/utils';
import { ADDRESSES } from '@/config';
import { useMode } from '@/context/ModeContext';
import { useLiveRwaState } from '@/hooks/useLiveRwaState';
import { EXPLORER_URL } from '@/lib/constants';

// ─── Demo card (original, untouched) ─────────────────────────────────────────
function DemoRwaStateCard() {
  const isFresh = !mockRwaState.isStale;

  return (
    <div className="panel p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1E2229]">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white tracking-tight">RWA State Oracle</h2>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
            DEMO / SIMULATED
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
              <span className="text-gray-500 text-[10px] ml-1">(simulated)</span>
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
                <><CheckCircle2 className="h-3 w-3" /> Fresh (&lt; 300s maxNavAge)</>
              ) : (
                <><AlertTriangle className="h-3 w-3" /> Stale (&gt; 300s maxNavAge)</>
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
            <span className="font-mono text-gray-300">Tier {mockRwaState.liquidityTier} (Sufficient)</span>
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

// ─── Live card ────────────────────────────────────────────────────────────────
function LiveRwaStateCard() {
  const state = useLiveRwaState();

  const isFresh = !state.isStale && state.supported;

  const navDisplay = state.isError
    ? 'Unavailable'
    : state.isLoading
    ? '...'
    : state.supported
    ? `$${(Number(state.nav) / 1e18).toFixed(4)}`
    : 'Unavailable';

  const navAgeDisplay = state.navUpdatedAt === 0n
    ? 'Never'
    : `${state.navAgeSeconds}s ago`;

  return (
    <div className="panel p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1E2229]">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white tracking-tight">RWA State Oracle</h2>
          </div>
          <div className="flex items-center gap-2">
            {state.isLoading && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              LIVE
            </span>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-2.5 rounded bg-[#0E1013] border border-[#1E2229]">
            <span className="text-gray-400">Target Asset</span>
            <span className="font-mono font-medium text-white">tBUSD (MockUSDC)</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded bg-[#0E1013] border border-[#1E2229]">
            <span className="text-gray-400">NAV (on-chain)</span>
            <span className={`font-mono font-medium ${state.isError ? 'text-gray-500 italic' : 'text-white'}`}>
              {navDisplay}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded bg-[#0E1013] border border-[#1E2229]">
            <span className="text-gray-400">NAV Age</span>
            <span className="font-mono text-gray-300">{navAgeDisplay}</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded bg-[#0E1013] border border-[#1E2229]">
            <span className="text-gray-400">Freshness</span>
            <span
              className={`inline-flex items-center gap-1.5 font-medium px-2 py-0.5 rounded text-[11px] font-mono ${
                state.isError || state.isLoading
                  ? 'bg-gray-500/10 text-gray-500 border border-gray-500/20'
                  : isFresh
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {state.isError || state.isLoading ? (
                'Unavailable'
              ) : isFresh ? (
                <><CheckCircle2 className="h-3 w-3" /> Fresh</>
              ) : (
                <><AlertTriangle className="h-3 w-3" /> Stale</>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded bg-[#0E1013] border border-[#1E2229]">
            <span className="text-gray-400">Redemption Window</span>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium ${
                state.isError
                  ? 'text-gray-500 italic'
                  : state.redemptionOpen
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {state.isError ? 'Unavailable' : state.redemptionOpen ? 'OPEN' : 'CLOSED'}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded bg-[#0E1013] border border-[#1E2229]">
            <span className="text-gray-400">Liquidity Tier</span>
            <span className="font-mono text-gray-300">
              {state.isError ? 'Unavailable' : `Tier ${state.liquidityTier}`}
            </span>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-[#1E2229] mt-3 flex items-center justify-between text-[11px] text-gray-500 font-mono">
        <span>RWAStateOracle · Arbitrum Sepolia</span>
        <a
          href={`${EXPLORER_URL}/address/${ADDRESSES.oracle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline truncate max-w-[140px]"
        >
          {ADDRESSES.oracle.slice(0, 8)}...{ADDRESSES.oracle.slice(-6)}
        </a>
      </div>
    </div>
  );
}

// ─── Export — branches on mode ─────────────────────────────────────────────────
export function RwaStateCard() {
  const { isDemo } = useMode();
  return isDemo ? <DemoRwaStateCard /> : <LiveRwaStateCard />;
}

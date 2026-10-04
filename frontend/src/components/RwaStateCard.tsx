'use client';

import React, { useCallback, useMemo } from 'react';
import { Copy, ExternalLink } from 'lucide-react';
import { ADDRESSES } from '@/config';
import { useLiveRwaState } from '@/hooks/useLiveRwaState';
import { EXPLORER_URL } from '@/lib/constants';

export function RwaStateCard() {
  const state = useLiveRwaState();

  const eligibility = useMemo(() => {
    if (state.isError) return { label: 'UNKNOWN', color: '#FF4400', bg: 'rgba(255,68,0,0.1)', border: 'rgba(255,68,0,0.25)' };
    if (!state.isStale && state.supported) return { label: 'ELIGIBLE', color: '#00E340', bg: 'rgba(0,227,64,0.1)', border: 'rgba(0,227,64,0.25)' };
    return { label: 'BLOCKED', color: '#FFE103', bg: 'rgba(255,225,3,0.1)', border: 'rgba(255,225,3,0.25)' };
  }, [state.isError, state.isStale, state.supported]);

  const isFresh = !state.isStale && state.supported;

  const navDisplay = state.isError
    ? 'Unavailable'
    : state.isLoading
    ? '...'
    : state.supported
    ? (Number(state.nav) / 1e18).toFixed(4)
    : 'Unavailable';

  const navAgeDisplay =
    state.navUpdatedAt === 0n ? 'Never' : String(state.navAgeSeconds) + 's ago';

  const copyAddress = useCallback(() => {
    navigator.clipboard.writeText(ADDRESSES.oracle);
  }, []);

  return (
    <div className="bg-[#0A1428] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-[#F5F7FA] tracking-tight">RWA ELIGIBILITY STATE</h2>
          <p className="text-[11px] text-[#9AA8BD] font-mono">Real-time Oracle Verification</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: eligibility.color }}
          />
          <span
            className="text-xs font-mono font-medium px-2 py-0.5 rounded"
            style={{ color: eligibility.color, backgroundColor: eligibility.bg, border: '1px solid ' + eligibility.border }}
          >
            {eligibility.label}
          </span>
        </div>
      </div>

      {/* Rows */}
      <div className="grid gap-2.5 text-xs">
        {/* NAV */}
        <div className="flex justify-between items-center p-3 rounded-[10px] bg-[#0F1B32] border border-[rgba(255,255,255,0.06)]">
          <div>
            <span className="text-[#9AA8BD] block font-mono text-[11px]">Oracle NAV</span>
            <span className="text-[10px] text-gray-500">Tokenized T-Bill Net Asset Value</span>
          </div>
          <span className="font-mono font-bold text-sm text-[#F5F7FA]">{navDisplay}</span>
        </div>

        {/* Freshness */}
        <div className="flex justify-between items-center p-3 rounded-[10px] bg-[#0F1B32] border border-[rgba(255,255,255,0.06)]">
          <div>
            <span className="text-[#9AA8BD] block font-mono text-[11px]">Heartbeat</span>
            <span className="text-[10px] text-gray-500">Updated {navAgeDisplay}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={isFresh ? 'w-2 h-2 rounded-full bg-[#00E340] animate-pulse' : (state.isError || state.isLoading) ? 'w-2 h-2 rounded-full bg-[#9AA8BD]' : 'w-2 h-2 rounded-full bg-[#FFE103]'} />
            <span className="font-mono text-xs font-medium text-[#F5F7FA]">
              {(state.isError || state.isLoading) ? 'Unavailable' : isFresh ? 'Fresh' : 'Stale'}
            </span>
          </div>
        </div>

        {/* Redemption */}
        <div className="flex justify-between items-center p-3 rounded-[10px] bg-[#0F1B32] border border-[rgba(255,255,255,0.06)]">
          <div>
            <span className="text-[#9AA8BD] block font-mono text-[11px]">Redemption Window</span>
            <span className="text-[10px] text-gray-500">On-chain liquidity access</span>
          </div>
          <span className="font-mono font-semibold text-xs">
            {state.isError
              ? <span className="text-gray-400">Unavailable</span>
              : state.redemptionOpen
              ? <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">OPEN</span>
              : <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">CLOSED</span>}
          </span>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-2.5 rounded-[10px] bg-[#0F1B32] border border-[rgba(255,255,255,0.06)]">
            <span className="text-[#9AA8BD] block font-mono text-[10px] uppercase">Liquidity Tier</span>
            <span className="font-mono font-bold text-xs text-[#F5F7FA] mt-1 block">
              {state.isError ? 'Unavailable' : 'Tier ' + state.liquidityTier}
            </span>
          </div>
          <div className="p-2.5 rounded-[10px] bg-[#0F1B32] border border-[rgba(255,255,255,0.06)]">
            <span className="text-[#9AA8BD] block font-mono text-[10px] uppercase">Asset Support</span>
            <span className="font-mono font-bold text-xs mt-1 block">
              {state.isError
                ? <span className="text-gray-400">Unavailable</span>
                : state.supported
                ? <span className="text-emerald-400">Whitelisted</span>
                : <span className="text-rose-400">Not Supported</span>}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between text-[11px] text-[#9AA8BD] font-mono">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          RWA State Oracle
        </span>
        <div className="flex items-center gap-2">
          <span>{ADDRESSES.oracle.slice(0, 6)}...{ADDRESSES.oracle.slice(-4)}</span>
          <button onClick={copyAddress} className="p-1 rounded hover:bg-[#0F1B32] text-gray-400 hover:text-white" title="Copy Oracle Address">
            <Copy className="h-3 w-3" />
          </button>
          <a href={EXPLORER_URL + '/address/' + ADDRESSES.oracle} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline" title="View on Arbiscan">
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

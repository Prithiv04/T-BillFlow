'use client';

import React from 'react';
import { FileCheck2, CheckCircle2, ShieldX, KeyRound, Loader2 } from 'lucide-react';
import { ADDRESSES } from '@/config';
import { useLiveMandate } from '@/hooks/useLiveMandate';
import { DEFAULT_MANDATE_ID, EXPLORER_URL } from '@/lib/constants';
import { formatUnits } from 'viem';

export function MandateCard() {
  const mandate = useLiveMandate(DEFAULT_MANDATE_ID);

  const isZeroId = (DEFAULT_MANDATE_ID as string) === '0x0000000000000000000000000000000000000000000000000000000000000000';

  const fmtUSDC = (v: bigint) =>
    isZeroId ? 'Unavailable' : `$${Number(formatUnits(v, 6)).toLocaleString()} tBUSD`;

  const percentUsed =
    mandate.maxCumulative > 0n
      ? Math.min(100, Number((mandate.used * 10000n) / mandate.maxCumulative) / 100)
      : 0;

  const isActive = !mandate.revoked && mandate.validUntil > BigInt(Math.floor(Date.now() / 1000));

  const agentDisplay = mandate.isLoading
    ? '...'
    : !mandate.agent
    ? 'Unavailable'
    : `${mandate.agent.slice(0, 10)}...${mandate.agent.slice(-6)}`;

  return (
    <div className="panel p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1E2229]">
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-white tracking-tight">Agent Mandate Registry</h2>
          </div>
          <div className="flex items-center gap-2">
            {mandate.isLoading && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              LIVE
            </span>
          </div>
        </div>

        {isZeroId ? (
          <div className="p-3 rounded bg-[#0E1013] border border-[#1E2229] text-xs text-gray-500 font-mono">
            Set <code className="text-gray-300">NEXT_PUBLIC_MANDATE_ID</code> in <code className="text-gray-300">.env.local</code> to track a registered on-chain mandate.
          </div>
        ) : (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded bg-[#0E1013] border border-[#1E2229]">
              <span className="text-gray-400">Designated Agent</span>
              <span className="font-mono text-gray-200">{agentDisplay}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded bg-[#0E1013] border border-[#1E2229]">
              <span className="text-gray-400">Allowed Action</span>
              <span className="font-mono font-medium text-emerald-400">
                {mandate.isLoading
                  ? '...'
                  : mandate.allowedActionsMask === 1n
                  ? 'DEPOSIT'
                  : mandate.allowedActionsMask === 2n
                  ? 'REDEEM'
                  : mandate.allowedActionsMask === 3n
                  ? 'DEPOSIT | REDEEM'
                  : 'Unavailable'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded bg-[#0E1013] border border-[#1E2229]">
              <span className="text-gray-400">Per-Tx Limit</span>
              <span className="font-mono text-white">{fmtUSDC(mandate.maxTx)}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded bg-[#0E1013] border border-[#1E2229]">
              <span className="text-gray-400">Cumulative Budget</span>
              <span className="font-mono text-white">{fmtUSDC(mandate.maxCumulative)}</span>
            </div>

            <div className="p-2.5 rounded bg-[#0E1013] border border-[#1E2229] space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Budget Utilized:</span>
                <span className="font-mono font-medium text-white">
                  {mandate.isLoading ? '...' : `${fmtUSDC(mandate.used)} (${percentUsed.toFixed(0)}%)`}
                </span>
              </div>
              <div className="h-1.5 w-full bg-[#181B20] rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${percentUsed}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded bg-[#0E1013] border border-[#1E2229]">
              <span className="text-gray-400">Status</span>
              <span
                className={`inline-flex items-center gap-1.5 font-medium px-2 py-0.5 rounded text-[11px] font-mono ${
                  mandate.isLoading
                    ? 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                    : isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {mandate.isLoading ? (
                  '...'
                ) : isActive ? (
                  <><CheckCircle2 className="h-3 w-3" /> ACTIVE</>
                ) : (
                  <><ShieldX className="h-3 w-3" /> REVOKED / INACTIVE</>
                )}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-[#1E2229] mt-3 flex items-center justify-between text-[11px] text-gray-500 font-mono">
        <span className="flex items-center gap-1">
          <KeyRound className="h-3 w-3 text-blue-400" />
          On-Chain Scoped Mandate
        </span>
        <a
          href={`${EXPLORER_URL}/address/${ADDRESSES.registry}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline truncate max-w-[140px]"
        >
          {ADDRESSES.registry.slice(0, 8)}...{ADDRESSES.registry.slice(-6)}
        </a>
      </div>
    </div>
  );
}

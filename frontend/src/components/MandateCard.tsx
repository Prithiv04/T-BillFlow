'use client';

import React from 'react';
import { mockMandate } from '@/mocks/data';
import { FileCheck2, CheckCircle2, ShieldX, KeyRound, Loader2 } from 'lucide-react';
import { ADDRESSES } from '@/config';
import { useMode } from '@/context/ModeContext';
import { useLiveMandate } from '@/hooks/useLiveMandate';
import { DEMO_MANDATE_ID, EXPLORER_URL } from '@/lib/constants';
import { formatUnits } from 'viem';

// ─── Demo card (original, untouched) ─────────────────────────────────────────
function DemoMandateCard() {
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
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
            DEMO / SIMULATED
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
            <span className="font-mono text-white">${mockMandate.maxTx.toLocaleString()} tBUSD</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded bg-[#0E1013] border border-[#1E2229]">
            <span className="text-gray-400">Cumulative Budget</span>
            <span className="font-mono text-white">${mockMandate.maxCumulative.toLocaleString()} tBUSD</span>
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
                <><CheckCircle2 className="h-3 w-3" /> Active &amp; Valid</>
              ) : (
                <><ShieldX className="h-3 w-3" /> Revoked</>
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

// ─── Live card ────────────────────────────────────────────────────────────────
function LiveMandateCard() {
  const mandate = useLiveMandate(DEMO_MANDATE_ID);

  const isZeroId = DEMO_MANDATE_ID === '0x0000000000000000000000000000000000000000000000000000000000000000';

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
            No on-chain mandate ID configured. Set <code>DEMO_MANDATE_ID</code> in constants.ts after
            calling <code>grantMandate()</code> on the registry.
          </div>
        ) : (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded bg-[#0E1013] border border-[#1E2229]">
              <span className="text-gray-400">Designated Agent</span>
              <span className="font-mono text-gray-200">{agentDisplay}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded bg-[#0E1013] border border-[#1E2229]">
              <span className="text-gray-400">Actions Mask</span>
              <span className="font-mono font-medium text-emerald-400">
                {mandate.allowedActionsMask === 1n
                  ? 'DEPOSIT'
                  : mandate.allowedActionsMask === 2n
                  ? 'REDEEM'
                  : mandate.allowedActionsMask === 3n
                  ? 'DEPOSIT | REDEEM'
                  : mandate.isError
                  ? 'Unavailable'
                  : `0x${mandate.allowedActionsMask.toString(16)}`}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded bg-[#0E1013] border border-[#1E2229]">
              <span className="text-gray-400">Per-Tx Limit</span>
              <span className="font-mono text-white">{fmtUSDC(mandate.maxTx)}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded bg-[#0E1013] border border-[#1E2229]">
              <span className="text-gray-400">Cumulative Cap</span>
              <span className="font-mono text-white">{fmtUSDC(mandate.maxCumulative)}</span>
            </div>

            {/* Budget meter */}
            {!mandate.isError && (
              <div className="p-2.5 rounded bg-[#0E1013] border border-[#1E2229] space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Budget Used:</span>
                  <span className="font-mono font-medium text-white">
                    {fmtUSDC(mandate.used)} ({percentUsed.toFixed(1)}%)
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
            )}

            <div className="flex items-center justify-between p-2.5 rounded bg-[#0E1013] border border-[#1E2229]">
              <span className="text-gray-400">Status</span>
              <span
                className={`inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded ${
                  mandate.isError
                    ? 'text-gray-500 italic'
                    : isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {mandate.isError ? (
                  'Unavailable'
                ) : isActive ? (
                  <><CheckCircle2 className="h-3 w-3" /> Active &amp; Valid</>
                ) : (
                  <><ShieldX className="h-3 w-3" /> {mandate.revoked ? 'Revoked' : 'Expired'}</>
                )}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-[#1E2229] mt-3 flex items-center justify-between text-[11px] text-gray-500 font-mono">
        <span className="flex items-center gap-1">
          <KeyRound className="h-3 w-3 text-blue-400" /> EIP-712 Nonce: {mandate.nonce.toString()}
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

// ─── Export — branches on mode ─────────────────────────────────────────────────
export function MandateCard() {
  const { isDemo } = useMode();
  return isDemo ? <DemoMandateCard /> : <LiveMandateCard />;
}

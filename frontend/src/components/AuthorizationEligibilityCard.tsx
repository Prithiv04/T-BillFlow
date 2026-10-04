"use client";

import React from 'react';
import { formatUnits } from 'viem';
import { ShieldCheck, ArrowDown } from 'lucide-react';
import { useLiveMandate } from '@/hooks/useLiveMandate';
import { useLiveRwaState } from '@/hooks/useLiveRwaState';
import { useLiveGate } from '@/hooks/useLiveGate';
import { DEFAULT_MANDATE_ID } from '@/lib/constants';

/**
 * Visual component showing the separation between Authorization (mandate) and
 * Eligibility (RWA asset state) and the final execution decision.
 *
 * All data is sourced from existing hooks – no duplicate contract reads.
 */
export function AuthorizationEligibilityCard() {
  // Authorization data
  const mandate = useLiveMandate(DEFAULT_MANDATE_ID);

  // Eligibility data
  const rwa = useLiveRwaState();

  // Execution gate info
  const { canExecute, gateReason } = useLiveGate(DEFAULT_MANDATE_ID);

  // Helpers
  const fmtBigInt = (value: bigint, decimals = 18) =>
    Number(formatUnits(value, decimals)).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const nowSec = BigInt(Math.floor(Date.now() / 1000));

  const isAuthActive =
    !mandate.revoked &&
    mandate.validUntil > nowSec &&
    mandate.validFrom <= nowSec &&
    mandate.used < mandate.maxCumulative;

  const isEligibilityOk = !rwa.isStale && rwa.supported;

  const decisionLabel = canExecute ? 'EXECUTION READY' : 'EXECUTION BLOCKED';
  const decisionStyle = canExecute
    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
    : 'bg-rose-500/10 border-rose-500/30 text-rose-400';

  return (
    <section className="panel p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-5 border-b border-[#1E2229]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              Authorization ≠ Eligibility
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-blue-500/15 border border-blue-500/30 text-blue-400">
                Core Invariant
              </span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              A valid mandate authorizes the agent to act; on-chain RWA state must also be eligible to execute.
            </p>
          </div>
        </div>
      </div>

      {/* Two‑column layout – stacks on small screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        {/* Authorization */}
        <div className="p-4 rounded-xl bg-[#0A1428] border border-[#1E2229]">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1E2229]">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-200">
              AUTHORIZATION (WHO MAY ACT)
            </span>
            <span
              className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                isAuthActive
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {isAuthActive ? 'ACTIVE' : 'INACTIVE'}
            </span>
          </div>
          <ul className="space-y-2.5 text-xs text-gray-300">
            <li className="flex items-center justify-between">
              <span className="font-medium text-gray-400">Mandate ID:</span>{' '}
              <span className="font-mono text-gray-200">{DEFAULT_MANDATE_ID.slice(0, 10)}…</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="font-medium text-gray-400">Agent:</span>{' '}
              <span className="font-mono text-gray-200">{mandate.agent ? `${mandate.agent.slice(0, 10)}...` : 'Unavailable'}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="font-medium text-gray-400">Target:</span>{' '}
              <span className="font-mono text-gray-200">{mandate.allowedTarget ? `${mandate.allowedTarget.slice(0, 10)}...` : 'Unavailable'}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="font-medium text-gray-400">Tx Limit:</span>{' '}
              <span className="font-mono text-gray-200">{mandate.maxTx !== undefined ? fmtBigInt(mandate.maxTx, 6) + ' tBUSD' : 'Unavailable'}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="font-medium text-gray-400">Cumulative Limit:</span>{' '}
              <span className="font-mono text-gray-200">{mandate.maxCumulative !== undefined ? fmtBigInt(mandate.maxCumulative, 6) + ' tBUSD' : 'Unavailable'}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="font-medium text-gray-400">Used:</span>{' '}
              <span className="font-mono text-gray-200">{mandate.used !== undefined ? fmtBigInt(mandate.used, 6) + ' tBUSD' : 'Unavailable'}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="font-medium text-gray-400">Expires:</span>{' '}
              <span className="font-mono text-gray-200">
                {mandate.validUntil !== undefined
                  ? new Date(Number(mandate.validUntil) * 1000).toLocaleString()
                  : 'Unavailable'}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span className="font-medium text-gray-400">Revoked:</span>{' '}
              <span className={`font-mono font-medium ${mandate.revoked ? 'text-rose-400' : 'text-emerald-400'}`}>
                {mandate.revoked ? 'Yes' : 'No'}
              </span>
            </li>
          </ul>
        </div>

        {/* Eligibility */}
        <div className="p-4 rounded-xl bg-[#0A1428] border border-[#1E2229]">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1E2229]">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-200">
              ELIGIBILITY (CAN ASSET BE ACTED UPON)
            </span>
            <span
              className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                isEligibilityOk
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {isEligibilityOk ? 'ELIGIBLE' : 'INELIGIBLE'}
            </span>
          </div>
          <ul className="space-y-2.5 text-xs text-gray-300">
            <li className="flex items-center justify-between">
              <span className="font-medium text-gray-400">Supported:</span>{' '}
              <span className={`font-mono font-medium ${rwa.supported ? 'text-emerald-400' : 'text-rose-400'}`}>
                {rwa.supported ? 'Yes' : 'No'}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span className="font-medium text-gray-400">NAV:</span>{' '}
              <span className="font-mono text-gray-200">{rwa.nav ? fmtBigInt(rwa.nav, 18) + ' tBUSD' : 'Unavailable'}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="font-medium text-gray-400">NAV Updated:</span>{' '}
              <span className="font-mono text-gray-200">
                {rwa.navUpdatedAt ? new Date(Number(rwa.navUpdatedAt) * 1000).toLocaleString() : 'Unavailable'}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span className="font-medium text-gray-400">Redemption Open:</span>{' '}
              <span className={`font-mono font-medium ${rwa.redemptionOpen ? 'text-emerald-400' : 'text-rose-400'}`}>
                {rwa.redemptionOpen ? 'Yes' : 'No'}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span className="font-medium text-gray-400">Liquidity Tier:</span>{' '}
              <span className="font-mono text-gray-200">{rwa.liquidityTier ?? 'Unavailable'}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="font-medium text-gray-400">NAV Age (s):</span>{' '}
              <span className="font-mono text-gray-200">{rwa.navAgeSeconds !== undefined ? `${rwa.navAgeSeconds}s` : 'Unavailable'}</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Execution decision */}
      <div className="flex items-center justify-center my-1">
        <div className="px-3 py-1 rounded-full bg-[#181B20] border border-[#2A303A] text-gray-400 text-[10px] font-mono flex items-center gap-1.5">
          <ArrowDown className="h-3 w-3 text-blue-400" />
          <span>Evaluated on-chain by AgentExecutionGate</span>
        </div>
      </div>

      <div className={`mt-3 p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${decisionStyle}`}>
        <div className="flex items-center gap-3">
          <span className="font-mono font-bold text-sm tracking-wide">{decisionLabel}</span>
          <span className="text-xs opacity-75">
            {canExecute
              ? 'Both mandate and RWA conditions satisfied on-chain.'
              : 'On-chain gate enforces separation of concerns.'}
          </span>
        </div>
        {!canExecute && gateReason && (
          <div className="px-3 py-1 rounded bg-[#0A0D12] border border-rose-500/25 text-rose-300 font-mono text-xs flex items-center gap-1.5 shrink-0">
            <span className="text-gray-400 text-[10px] uppercase">Reason:</span>
            <span className="font-semibold">{gateReason}</span>
          </div>
        )}
      </div>
    </section>
  );
}

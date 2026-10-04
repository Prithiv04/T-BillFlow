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

  const decisionLabel = canExecute ? 'EXECUTION ALLOWED' : 'EXECUTION BLOCKED';
  const decisionStyle = canExecute
    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
    : 'bg-rose-500/10 border-rose-500/20 text-rose-400';

  return (
    <section className="panel p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-blue-500" /> Authorization ≠ Eligibility
        </h2>
        <p className="text-xs text-gray-400">
          A valid mandate authorises the agent; the RWA state must also be eligible.
        </p>
      </div>

      {/* Two‑column layout – stacks on small screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Authorization */}
        <div className="p-4 rounded-lg bg-[#0A1428] border border-[#1E2229]">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1E2229]">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-200">
              AUTHORIZATION
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                isAuthActive
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {isAuthActive ? 'ACTIVE' : 'INACTIVE'}
            </span>
          </div>
          <ul className="space-y-2 text-xs text-gray-300">
            <li>
              <span className="font-medium text-gray-200">Mandate ID:</span>{' '}
              {DEFAULT_MANDATE_ID.slice(0, 10)}…
            </li>
            <li>
              <span className="font-medium text-gray-200">Agent:</span>{' '}
              {mandate.agent || 'Unavailable'}
            </li>
            <li>
              <span className="font-medium text-gray-200">Target:</span>{' '}
              {mandate.allowedTarget || 'Unavailable'}
            </li>
            <li>
              <span className="font-medium text-gray-200">Tx Limit:</span>{' '}
              {mandate.maxTx !== undefined ? fmtBigInt(mandate.maxTx, 6) + ' tBUSD' : 'Unavailable'}
            </li>
            <li>
              <span className="font-medium text-gray-200">Cumulative Limit:</span>{' '}
              {mandate.maxCumulative !== undefined ? fmtBigInt(mandate.maxCumulative, 6) + ' tBUSD' : 'Unavailable'}
            </li>
            <li>
              <span className="font-medium text-gray-200">Used:</span>{' '}
              {mandate.used !== undefined ? fmtBigInt(mandate.used, 6) + ' tBUSD' : 'Unavailable'}
            </li>
            <li>
              <span className="font-medium text-gray-200">Expires:</span>{' '}
              {mandate.validUntil !== undefined
                ? new Date(Number(mandate.validUntil) * 1000).toLocaleString()
                : 'Unavailable'}
            </li>
            <li>
              <span className="font-medium text-gray-200">Revoked:</span>{' '}
              {mandate.revoked ? 'Yes' : 'No'}
            </li>
          </ul>
        </div>

        {/* Eligibility */}
        <div className="p-4 rounded-lg bg-[#0A1428] border border-[#1E2229]">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1E2229]">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-200">
              ELIGIBILITY
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                isEligibilityOk
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {isEligibilityOk ? 'ELIGIBLE' : 'INELIGIBLE'}
            </span>
          </div>
          <ul className="space-y-2 text-xs text-gray-300">
            <li>
              <span className="font-medium text-gray-200">Supported:</span>{' '}
              {rwa.supported ? 'Yes' : 'No'}
            </li>
            <li>
              <span className="font-medium text-gray-200">NAV:</span>{' '}
              {rwa.nav ? fmtBigInt(rwa.nav, 6) + ' tBUSD' : 'Unavailable'}
            </li>
            <li>
              <span className="font-medium text-gray-200">NAV Updated:</span>{' '}
              {rwa.navUpdatedAt ? new Date(Number(rwa.navUpdatedAt) * 1000).toLocaleString() : 'Unavailable'}
            </li>
            <li>
              <span className="font-medium text-gray-200">Redemption Open:</span>{' '}
              {rwa.redemptionOpen ? 'Yes' : 'No'}
            </li>
            <li>
              <span className="font-medium text-gray-200">Liquidity Tier:</span>{' '}
              {rwa.liquidityTier ?? 'Unavailable'}
            </li>
            <li>
              <span className="font-medium text-gray-200">NAV Age (s):</span>{' '}
              {rwa.navAgeSeconds !== undefined ? rwa.navAgeSeconds : 'Unavailable'}
            </li>
          </ul>
        </div>
      </div>

      {/* Execution decision */}
      <div className="flex items-center justify-center -my-2">
        <div className="p-1 rounded-full bg-[#181B20] border border-[#2A303A] text-gray-400">
          <ArrowDown className="h-4 w-4" />
        </div>
      </div>
      <div className={`p-3.5 rounded-lg border flex items-center justify-between ${decisionStyle}`}>
        <span className="font-semibold text-sm">{decisionLabel}</span>
        {!canExecute && gateReason && (
          <span className="text-xs italic text-gray-300">Reason: {gateReason}</span>
        )}
      </div>
    </section>
  );
}

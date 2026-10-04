"use client";

import React from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, ArrowDown, FileText, Activity } from 'lucide-react';
import { useLiveGate } from '@/hooks/useLiveGate';
import { useLiveMandate } from '@/hooks/useLiveMandate';
import { DEFAULT_MANDATE_ID } from '@/lib/constants';
import { formatUnits } from 'viem';

export function AuthVsEligibilityVisualizer() {
  const { canExecute: canExecuteLive, gateReason } = useLiveGate(DEFAULT_MANDATE_ID);
  const mandate = useLiveMandate(DEFAULT_MANDATE_ID);

  const formatLimit = (val: bigint) => {
    if (!val || val === 0n) return '';
    const decimals = val > 100_000_000_000_000n ? 18 : 6;
    const num = Number(formatUnits(val, decimals));
    return ` (<$${num >= 1_000_000 ? `${(num / 1_000_000).toFixed(0)}M` : num.toLocaleString()})`;
  };

  const txLimitSuffix = formatLimit(mandate.maxTx);
  const cumLimitSuffix = formatLimit(mandate.maxCumulative);

  const canExecute = canExecuteLive;
  const reasons = gateReason ? [gateReason] : ['Gate blocked'];

  const isAuthError = Boolean(
    gateReason && (
      gateReason.includes('CallerNotAgent') ||
      gateReason.includes('Mandate') ||
      gateReason.includes('LimitExceeded') ||
      gateReason.includes('GatePaused') ||
      gateReason.includes('ActionNotAllowed') ||
      gateReason.includes('TargetNotAllowed') ||
      gateReason.includes('SelectorNotAllowed') ||
      gateReason.includes('wallet')
    )
  );
  const isEligibilityError = Boolean(
    gateReason && (
      gateReason.includes('NavStale') ||
      gateReason.includes('RedemptionClosed') ||
      gateReason.includes('LiquidityTooLow') ||
      gateReason.includes('AssetNotSupported')
    )
  );

  // Authorization checks (reflects on-chain gate evaluation)
  const authChecks = [
    {
      label: 'Mandate Registered & Active',
      passed: canExecuteLive || (!gateReason.includes('MandateNotFound') && !gateReason.includes('MandateRevoked') && !gateReason.includes('MandateExpired')),
    },
    {
      label: 'Designated Agent Identity',
      passed: canExecuteLive || !gateReason.includes('CallerNotAgent'),
    },
    {
      label: 'Action & Target Whitelist',
      passed: canExecuteLive || (!gateReason.includes('ActionNotAllowed') && !gateReason.includes('TargetNotAllowed') && !gateReason.includes('SelectorNotAllowed')),
    },
    {
      label: `Per-Transaction Limit${txLimitSuffix || ' (<$1M)'}`,
      passed: canExecuteLive || !gateReason.includes('TxLimitExceeded'),
    },
    {
      label: `Cumulative Limit${cumLimitSuffix || ' (<$5M)'}`,
      passed: canExecuteLive || !gateReason.includes('CumulativeLimitExceeded'),
    },
  ];

  // RWA Eligibility checks (reflects on-chain oracle gate evaluation)
  const eligibilityChecks = [
    {
      label: 'Asset Supported in Oracle',
      passed: canExecuteLive || !gateReason.includes('AssetNotSupported'),
    },
    {
      label: 'NAV Freshness (<86,400s maxNavAge)',
      passed: canExecuteLive || !gateReason.includes('NavStale'),
    },
    {
      label: 'Redemption Window Status',
      passed: canExecuteLive || !gateReason.includes('RedemptionClosed'),
    },
    {
      label: 'Sufficient Liquidity Tier (>=1)',
      passed: canExecuteLive || !gateReason.includes('LiquidityTooLow'),
    },
  ];

  const authPassed = canExecuteLive || !isAuthError;
  const eligibilityPassed = canExecuteLive || !isEligibilityError;

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            Core Execution Boundary: Authorization ≠ Eligibility
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            An off-chain agent may hold valid delegated authority, but execution is blocked if the underlying RWA is ineligible.
          </p>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#181B20] text-gray-300 border border-[#2A303A]">
          AgentExecutionGate.sol
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Left Column: AUTHORIZATION */}
        <div className="p-4 rounded-lg bg-[#0E1013] border border-[#1E2229]">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1E2229]">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-200">
                1. Authorization
              </span>
            </div>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                authPassed
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {authPassed ? 'VALID MANDATE' : 'INVALID'}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {authChecks.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-gray-300">
                <span className="text-[11px]">{item.label}</span>
                {item.passed ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 pt-2 border-t border-[#1E2229] text-[10px] font-mono text-gray-500">
            Source: AgentMandateRegistry.sol
          </div>
        </div>

        {/* Right Column: ELIGIBILITY */}
        <div className="p-4 rounded-lg bg-[#0E1013] border border-[#1E2229]">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1E2229]">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-200">
                2. RWA Eligibility
              </span>
            </div>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                eligibilityPassed
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {eligibilityPassed ? 'RWA ELIGIBLE' : 'INELIGIBLE'}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {eligibilityChecks.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-gray-300">
                <span className="text-[11px]">{item.label}</span>
                {item.passed ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 pt-2 border-t border-[#1E2229] text-[10px] font-mono text-gray-500">
            Source: RWAStateOracle.sol
          </div>
        </div>
      </div>

      {/* Convergence Node: Execution Decision */}
      <div className="flex items-center justify-center -my-1">
        <div className="p-1 rounded-full bg-[#181B20] border border-[#2A303A] text-gray-400">
          <ArrowDown className="h-3.5 w-3.5" />
        </div>
      </div>

      <div
        className={`p-3.5 rounded-lg border mt-2 flex items-center justify-between ${
          canExecute
            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
            : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {canExecute ? (
            <ShieldCheck className="h-5 w-5 shrink-0" />
          ) : (
            <ShieldAlert className="h-5 w-5 shrink-0" />
          )}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider">
              {canExecute
                ? 'Execution Gate: PERMITTED'
                : `EXECUTION BLOCKED — (${reasons.join(' • ')})`}
            </div>
            <div className="text-[11px] opacity-80 mt-0.5">
              {canExecute
                ? 'All mandate parameters and real-world asset criteria satisfied. Calldata forwarded.'
                : 'Blocked by on-chain gate. The AI proposed an action, but execution was refused because the RWA was ineligible.'}
            </div>
          </div>
        </div>

        <div className="text-[10px] font-mono px-2 py-1 rounded bg-black/40 border border-white/5">
          canExecute() == {canExecute ? 'true' : 'false'}
        </div>
      </div>
    </div>
  );
}

"use client";

import React from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, ArrowDown, FileText, Activity } from 'lucide-react';
import { useCanExecute } from '@/hooks/useCanExecute';
import { mockMandate, mockRwaState } from '@/mocks/data';

export function AuthVsEligibilityVisualizer() {
  const { canExecute, reasons } = useCanExecute();

  // Authorization checks
  const authChecks = [
    { label: 'Mandate Registered & Active', passed: !mockMandate.revoked },
    { label: 'Designated Agent Identity', passed: Boolean(mockMandate.agent) },
    { label: 'Action Permission (DEPOSIT)', passed: mockMandate.allowedAction === 'DEPOSIT' },
    { label: 'Target Whitelist (TBillVault)', passed: true },
    { label: 'Per-Transaction Limit (<$1M)', passed: true },
    { label: 'Cumulative Limit (<$5M)', passed: mockMandate.used < mockMandate.maxCumulative },
  ];

  // RWA Eligibility checks
  const eligibilityChecks = [
    { label: 'Asset Supported in Oracle', passed: mockRwaState.supported },
    { label: 'NAV Freshness (<300s maxNavAge)', passed: !mockRwaState.isStale },
    { label: 'Redemption Window Status', passed: mockRwaState.redemptionOpen },
    { label: 'Sufficient Liquidity Tier (>=1)', passed: mockRwaState.liquidityTier >= 1 },
  ];

  const authPassed = authChecks.every((c) => c.passed);
  const eligibilityPassed = eligibilityChecks.every((c) => c.passed);

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
                : `Execution Gate: REVERTED (${reasons.join(' • ')})`}
            </div>
            <div className="text-[11px] opacity-80 mt-0.5">
              {canExecute
                ? 'All mandate parameters and real-world asset criteria satisfied. Calldata forwarded.'
                : 'Blocked by on-chain gate. The AI proposed an action, but authority was refused.'}
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

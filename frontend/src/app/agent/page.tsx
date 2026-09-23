"use client";

import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Bot, Terminal } from 'lucide-react';
import { YIELD_THRESHOLD } from '@/config';
import { mockYield, mockRwaState, mockMandate } from '@/mocks/data';

export default function AgentPage() {
  const currentYield = mockYield;
  const isYieldOk = currentYield >= YIELD_THRESHOLD;
  const isRwaOk = !mockRwaState.isStale && mockRwaState.redemptionOpen;
  const isMandateOk = !mockMandate.revoked;
  const isGateOk = isYieldOk && isRwaOk && isMandateOk;

  const logs = [
    {
      time: '19:42:13 UTC',
      title: 'Opportunity detected',
      lines: [
        `Synthetic Opportunity Yield: ${currentYield.toFixed(1)}%`,
        `Configured Minimum Threshold: ${YIELD_THRESHOLD.toFixed(1)}%`,
        `Yield Condition: ${isYieldOk ? 'PASS (Yield exceeds threshold)' : 'FAIL'}`,
      ],
    },
    {
      time: '19:42:14 UTC',
      title: 'RWA Oracle Eligibility Check',
      lines: [
        `Asset: USTB (Simulated US Treasury)`,
        `NAV Freshness: ${!mockRwaState.isStale ? 'PASS (Fresh)' : 'FAIL (Stale)'}`,
        `Redemption Window: ${mockRwaState.redemptionOpen ? 'PASS (Open)' : 'FAIL (Closed)'}`,
        `Liquidity Tier: Tier ${mockRwaState.liquidityTier} (Sufficient)`,
      ],
    },
    {
      time: '19:42:14 UTC',
      title: 'Mandate Registry Authorization',
      lines: [
        `Agent Identity: ${mockMandate.agent} (Authorized)`,
        `Allowed Action: ${mockMandate.allowedAction}`,
        `Cumulative Cap Check: Used $${mockMandate.used.toLocaleString()} of $${mockMandate.maxCumulative.toLocaleString()}`,
        `Mandate Validity: ${!mockMandate.revoked ? 'PASS (Active)' : 'FAIL (Revoked)'}`,
      ],
    },
    {
      time: '19:42:15 UTC',
      title: 'AgentExecutionGate Decision',
      lines: [
        `canExecute() evaluation: ${isGateOk ? 'ALLOWED' : 'BLOCKED'}`,
        isGateOk
          ? 'Calldata forwarded to TBillVault: SUCCESS'
          : 'Gate Reverted: Unauthorized or Ineligible',
      ],
    },
  ];

  return (
    <AppShell
      title="Autonomous Agent Pipeline"
      subtitle="Off-Chain Rule-Based Opportunity Monitoring & Explainable Logic"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Agent Telemetry Card */}
        <div className="panel p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1E2229]">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-white tracking-tight">Execution Agent #01</h2>
            </div>
            <span className="badge badge-green font-mono text-[10px]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              RUNNING
            </span>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="p-2.5 rounded bg-[#0E1013] border border-[#1E2229]">
              <span className="text-gray-500 block text-[10px] uppercase">Execution Strategy</span>
              <span className="text-white">Deterministic Threshold Policy</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded bg-[#0E1013] border border-[#1E2229]">
                <span className="text-gray-500 block text-[10px] uppercase">Threshold</span>
                <span className="text-white">{YIELD_THRESHOLD.toFixed(1)}% APY</span>
              </div>
              <div className="p-2 rounded bg-[#0E1013] border border-[#1E2229]">
                <span className="text-gray-500 block text-[10px] uppercase">Current Yield</span>
                <span className="text-emerald-400 font-bold">{currentYield.toFixed(1)}% APY</span>
              </div>
            </div>

            <div className="p-2.5 rounded bg-[#0E1013] border border-[#1E2229] space-y-1">
              <div className="flex justify-between text-gray-400">
                <span>Polling Interval:</span>
                <span className="text-white">60s</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Last Polled:</span>
                <span className="text-gray-300">12s ago</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Next Evaluation:</span>
                <span className="text-gray-300">48s</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded bg-[#0E1013] border border-[#1E2229] text-[11px] text-gray-400">
            <span className="text-gray-300 font-semibold block mb-1">Architecture Invariant:</span>
            The off-chain agent never calls the vault directly. All execution requests pass through AgentExecutionGate.
          </div>
        </div>

        {/* Execution Decision Timeline & Structured Logs */}
        <div className="panel lg:col-span-2 p-5">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1E2229]">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-white tracking-tight">
                Explainable Decision Log (agent/agent.py)
              </h2>
            </div>
            <span className="text-[10px] font-mono text-gray-500">Live stdout stream</span>
          </div>

          <div className="space-y-3">
            {logs.map((log, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-[#0E1013] border border-[#1E2229] space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs font-mono pb-1 border-b border-[#1E2229]/60">
                  <span className="font-semibold text-blue-400 flex items-center gap-1.5">
                    <span className="text-gray-600">[{idx + 1}]</span> {log.title}
                  </span>
                  <span className="text-[10px] text-gray-500">{log.time}</span>
                </div>
                <div className="font-mono text-[11px] space-y-0.5 text-gray-300">
                  {log.lines.map((line, lidx) => (
                    <div key={lidx} className="flex items-center gap-2">
                      <span className="text-gray-600">›</span>
                      <span>{line}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

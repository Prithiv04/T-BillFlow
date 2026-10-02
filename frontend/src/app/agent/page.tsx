"use client";

import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Bot, Terminal } from 'lucide-react';
import { YIELD_THRESHOLD } from '@/config';
import { useLiveGate } from '@/hooks/useLiveGate';
import { useTreasuryYield } from '@/hooks/useTreasuryYield';
import { useLiveRwaState } from '@/hooks/useLiveRwaState';
import { useLiveMandate } from '@/hooks/useLiveMandate';
import { DEFAULT_MANDATE_ID } from '@/lib/constants';
import { formatUnits } from 'viem';

export default function AgentPage() {
  const { canExecute: canExecuteLive, gateReason } = useLiveGate();
  const treasuryData = useTreasuryYield();
  const liveRwa = useLiveRwaState();
  const liveMandate = useLiveMandate(DEFAULT_MANDATE_ID);

  const nowSec = BigInt(Math.floor(Date.now() / 1000));
  const isLiveMandateValid =
    !liveMandate.revoked &&
    liveMandate.validUntil > nowSec &&
    liveMandate.validFrom <= nowSec &&
    liveMandate.used < liveMandate.maxCumulative;

  const liveLogs = [
    {
      time: 'Live Stream',
      title: 'Treasury Opportunity Pipeline',
      lines: [
        `3M U.S. Treasury Benchmark: ${treasuryData.formattedYield}`,
        `Configured Threshold: ${YIELD_THRESHOLD.toFixed(1)}% APY`,
        `Yield Assessment: ${
          treasuryData.yield !== null
            ? treasuryData.yield >= YIELD_THRESHOLD
              ? 'PASS (Exceeds threshold)'
              : 'INFO (Below threshold)'
            : 'Unavailable'
        }`,
      ],
    },
    {
      time: 'Live Stream',
      title: 'RWA State Oracle Verification',
      lines: [
        `Target Asset: tBUSD (MockUSDC)`,
        `NAV Freshness: ${
          liveRwa.isError
            ? 'Unavailable'
            : !liveRwa.isStale
            ? 'PASS (Fresh)'
            : `FAIL (Stale — ${liveRwa.navAgeSeconds}s old)`
        }`,
        `Redemption Window: ${
          liveRwa.isError
            ? 'Unavailable'
            : liveRwa.redemptionOpen
            ? 'PASS (Open)'
            : 'FAIL (Closed)'
        }`,
        `Liquidity Tier: ${
          liveRwa.isError
            ? 'Unavailable'
            : `Tier ${liveRwa.liquidityTier} (Required >= 1)`
        }`,
      ],
    },
    {
      time: 'Live Stream',
      title: 'Agent Mandate Authorization',
      lines: [
        `Designated Agent: ${
          liveMandate.isError || !liveMandate.agent ? 'Unavailable' : liveMandate.agent
        }`,
        `Action Permission: ${
          liveMandate.isError
            ? 'Unavailable'
            : liveMandate.allowedActionsMask === 3n
            ? 'DEPOSIT | REDEEM'
            : 'DEPOSIT'
        }`,
        `Cumulative Budget: ${
          liveMandate.isError
            ? 'Unavailable'
            : `Used $${Number(formatUnits(liveMandate.used, 6)).toLocaleString()} / $${Number(
                formatUnits(liveMandate.maxCumulative, 6)
              ).toLocaleString()}`
        }`,
        `Mandate State: ${
          liveMandate.isError || !liveMandate.agent
            ? 'Unavailable'
            : isLiveMandateValid
            ? 'PASS (Active & Valid)'
            : 'FAIL (Revoked/Expired)'
        }`,
      ],
    },
    {
      time: 'Live Stream',
      title: 'AgentExecutionGate Simulation',
      lines: [
        `canExecuteAs() on-chain: ${canExecuteLive ? 'ALLOWED' : 'BLOCKED'}`,
        canExecuteLive
          ? 'Calldata forwarded to TBillVault: PERMITTED'
          : `Gate Reverted: ${gateReason}`,
      ],
    },
  ];

  const logs = liveLogs;

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
                <span className="text-emerald-400 font-bold">
                  {treasuryData.formattedYield}
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded bg-[#0E1013] border border-[#1E2229] space-y-1">
              <div className="flex justify-between text-gray-400">
                <span>Polling Interval:</span>
                <span className="text-white">60s</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>RWA Oracle:</span>
                <span className="text-gray-300">15s refetch</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Gate Simulation:</span>
                <span className="text-gray-300">15s refetch</span>
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

"use client";

import React, { useState, useCallback } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { MainExecutionPanel } from '@/components/execution/MainExecutionPanel';
import { AuthVsEligibilityVisualizer } from '@/components/execution/AuthVsEligibilityVisualizer';
import { TechnicalDetailsDrawer } from '@/components/execution/TechnicalDetailsDrawer';
import { DemoScenarioBar, ScenarioType } from '@/components/execution/DemoScenarioBar';
import { RwaStateCard } from '@/components/RwaStateCard';
import { MandateCard } from '@/components/MandateCard';
import { TransactionHistory } from '@/components/TransactionHistory';
import { resetDemo } from '@/mocks/data';
import { Wallet, ShieldCheck, TrendingUp, Bot } from 'lucide-react';
import { useCanExecute } from '@/hooks/useCanExecute';
import { APY } from '@/lib/constants';
import { useMode } from '@/context/ModeContext';

export default function OverviewPage() {
  const { isDemo } = useMode();
  const [, setTick] = useState(0);
  const [activeScenario, setActiveScenario] = useState<ScenarioType>('valid');
  const { canExecute } = useCanExecute();

  const refresh = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  const handleReset = () => {
    setActiveScenario('valid');
    resetDemo();
    refresh();
  };

  return (
    <AppShell
      title="Operations Overview"
      subtitle="Autonomous Agent Execution & RWA Boundary Enforcement"
    >
      {/* 1. Executive Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="panel p-4">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
            <span>Portfolio Value</span>
            <Wallet className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">$1,284,320.00</div>
          <div className="text-[10px] text-gray-500 font-mono mt-0.5">1,281,000 USTB Shares</div>
        </div>

        <div className="panel p-4">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
            <span>Active Mandates</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">1 Active</div>
          <div className="text-[10px] text-gray-500 font-mono mt-0.5">EIP-712 Scoped Delegation</div>
        </div>

        <div className="panel p-4">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
            <span>Execution Gate Status</span>
            <Bot className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono">
            <span
              className={`text-sm px-2 py-0.5 rounded font-mono font-semibold ${
                canExecute
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {canExecute ? 'EXECUTION ALLOWED' : 'EXECUTION BLOCKED'}
            </span>
          </div>
          <div className="text-[10px] text-gray-500 font-mono mt-1">canExecute() on-chain evaluation</div>
        </div>

        <div className="panel p-4">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
            <span>Current APY</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">{APY}%</div>
          <div className="text-[10px] text-gray-500 font-mono mt-0.5">US Treasury 3M benchmark</div>
        </div>
      </div>

      {/* 2. Demo Scenario Harness (Demo mode only) or Live Mode Banner */}
      {isDemo ? (
        <DemoScenarioBar
          activeScenario={activeScenario}
          onScenarioChange={(sc) => {
            setActiveScenario(sc);
            refresh();
          }}
          onReset={handleReset}
        />
      ) : (
        <div className="flex items-center justify-between p-4 mb-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-emerald-400">LIVE ARBITRUM SEPOLIA MODE</span>
            <span className="text-gray-400">— Reading real on-chain state from AgentExecutionGate, RWAStateOracle & MandateRegistry.</span>
          </div>
          <div className="text-gray-500 font-mono">Chain ID: 421614</div>
        </div>
      )}

      {/* 3. Main Operational Panels: Gate & RWA/Mandate details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <MainExecutionPanel onExecuted={refresh} />
        <div className="grid grid-cols-1 gap-6">
          <RwaStateCard />
          <MandateCard />
        </div>
      </div>

      {/* 4. Dedicated Core Visualizer: Authorization != Eligibility */}
      <div className="mb-6">
        <AuthVsEligibilityVisualizer />
      </div>

      {/* 5. Execution Operations Log */}
      <div className="mb-6">
        <TransactionHistory />
      </div>

      {/* 6. Technical Details Drawer (For judges and auditors) */}
      <div className="mb-6">
        <TechnicalDetailsDrawer />
      </div>
    </AppShell>
  );
}

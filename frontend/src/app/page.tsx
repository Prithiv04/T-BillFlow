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
import { useLiveGate } from '@/hooks/useLiveGate';
import { useTreasuryYield } from '@/hooks/useTreasuryYield';
import { useMode } from '@/context/ModeContext';
import { useVault } from '@/hooks/useVault';
import { useLiveMandate } from '@/hooks/useLiveMandate';
import { DEMO_MANDATE_ID } from '@/lib/constants';
import { formatUnits } from 'viem';

export default function OverviewPage() {
  const { isDemo } = useMode();
  const [, setTick] = useState(0);
  const [activeScenario, setActiveScenario] = useState<ScenarioType>('valid');
  const { canExecute: canExecuteDemo } = useCanExecute();
  const { canExecute: canExecuteLive } = useLiveGate();
  const canExecute = isDemo ? canExecuteDemo : canExecuteLive;
  const treasuryData = useTreasuryYield();
  const {
    isConnected,
    shareBalance,
    isBalanceLoading,
    portfolioAssets,
    isPortfolioLoading,
  } = useVault();
  const liveMandate = useLiveMandate(DEMO_MANDATE_ID);

  const refresh = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  const handleReset = () => {
    setActiveScenario('valid');
    resetDemo();
    refresh();
  };

  // ── Derive Live vs Demo metrics strictly ─────────────────────────────────────
  let portfolioValueDisplay = '$1,284,320.00';
  let sharesDisplay = '1,281,000 USTB Shares';
  let activeMandatesDisplay = '1 Active';
  let activeMandatesSub = 'EIP-712 Scoped Delegation';

  if (!isDemo) {
    if (!isConnected) {
      portfolioValueDisplay = 'Unavailable';
      sharesDisplay = 'Connect wallet to view position';
    } else if (isBalanceLoading || isPortfolioLoading) {
      portfolioValueDisplay = '...';
      sharesDisplay = 'Reading TBillVault...';
    } else if (shareBalance !== undefined && portfolioAssets !== undefined) {
      const valNum = Number(formatUnits(portfolioAssets, 18));
      const sharesNum = Number(formatUnits(shareBalance, 18));
      portfolioValueDisplay = `$${valNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      sharesDisplay = `${sharesNum.toLocaleString(undefined, { maximumFractionDigits: 4 })} USTB Shares`;
    } else {
      portfolioValueDisplay = 'Unavailable';
      sharesDisplay = 'Unavailable';
    }

    if (liveMandate.isLoading) {
      activeMandatesDisplay = '...';
      activeMandatesSub = 'Querying registry...';
    } else if (liveMandate.isError || !liveMandate.agent) {
      activeMandatesDisplay = 'Unavailable';
      activeMandatesSub = 'Registry unavailable';
    } else {
      const nowSec = BigInt(Math.floor(Date.now() / 1000));
      const isActive =
        !liveMandate.revoked &&
        liveMandate.validUntil > nowSec &&
        liveMandate.validFrom <= nowSec &&
        liveMandate.used < liveMandate.maxCumulative;
      activeMandatesDisplay = isActive ? '1 Active' : '0 Active';
      activeMandatesSub = isActive
        ? 'EIP-712 Active Mandate'
        : liveMandate.revoked
        ? 'Mandate Revoked'
        : 'Mandate Inactive/Expired';
    }
  }

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
          <div className="text-xl font-bold font-mono text-white">{portfolioValueDisplay}</div>
          <div className="text-[10px] text-gray-500 font-mono mt-0.5">{sharesDisplay}</div>
        </div>

        <div className="panel p-4">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
            <span>Active Mandates</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">{activeMandatesDisplay}</div>
          <div className="text-[10px] text-gray-500 font-mono mt-0.5">{activeMandatesSub}</div>
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
            <span>{isDemo ? 'Current APY' : '3M U.S. Treasury Yield'}</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {treasuryData.formattedYield}
          </div>
          <div className="text-[10px] text-gray-500 font-mono mt-0.5">
            {isDemo
              ? 'US Treasury 3M benchmark (simulated)'
              : treasuryData.observationDate
              ? `As of ${treasuryData.observationDate} · U.S. Treasury`
              : 'Daily Treasury Par Yield Curve Rates'}
          </div>
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

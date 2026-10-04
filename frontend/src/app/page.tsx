"use client";

import React, { useState, useCallback } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { MainExecutionPanel } from '@/components/execution/MainExecutionPanel';
import { AuthorizationEligibilityCard } from '@/components/AuthorizationEligibilityCard';
import { TechnicalDetailsDrawer } from '@/components/execution/TechnicalDetailsDrawer';
import { RwaStateCard } from '@/components/RwaStateCard';
import { MandateCard } from '@/components/MandateCard';
import { TransactionHistory } from '@/components/TransactionHistory';
import { Wallet, ShieldCheck, TrendingUp, Bot } from 'lucide-react';
import { useLiveGate } from '@/hooks/useLiveGate';
import { useTreasuryYield } from '@/hooks/useTreasuryYield';
import { useVault } from '@/hooks/useVault';
import { useLiveMandate } from '@/hooks/useLiveMandate';
import { DEFAULT_MANDATE_ID } from '@/lib/constants';
import { formatUnits } from 'viem';

export default function OverviewPage() {
  const [, setTick] = useState(0);
  const { canExecute } = useLiveGate();
  const treasuryData = useTreasuryYield();
  const {
    isConnected,
    shareBalance,
    isBalanceLoading,
    portfolioAssets,
    isPortfolioLoading,
  } = useVault();
  const liveMandate = useLiveMandate(DEFAULT_MANDATE_ID);

  const refresh = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  // ── Derive Live on-chain metrics strictly ─────────────────────────────────────
  let portfolioValueDisplay = 'Unavailable';
  let sharesDisplay = 'Connect wallet to view position';
  let activeMandatesDisplay = 'Unavailable';
  let activeMandatesSub = 'Querying registry...';

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

  return (
    <AppShell
      title="Operations Overview"
      subtitle="Autonomous Agent Execution & RWA Boundary Enforcement"
    >
      {/* 1. Executive Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="panel p-5">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-1.5">
            <span className="font-medium">Portfolio Position</span>
            <Wallet className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white tracking-tight">{portfolioValueDisplay}</div>
          <div className="text-[11px] text-gray-500 font-mono mt-1">{sharesDisplay}</div>
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-1.5">
            <span className="font-medium">Active Mandates</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white tracking-tight">{activeMandatesDisplay}</div>
          <div className="text-[11px] text-gray-500 font-mono mt-1">{activeMandatesSub}</div>
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-1.5">
            <span className="font-medium">Execution Gate Status</span>
            <Bot className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono mt-0.5">
            <span
              className={`text-xs px-2.5 py-1 rounded font-mono font-bold tracking-wide inline-flex items-center gap-1.5 ${
                canExecute
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${canExecute ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              {canExecute ? 'EXECUTION READY' : 'EXECUTION BLOCKED'}
            </span>
          </div>
          <div className="text-[11px] text-gray-500 font-mono mt-1">canExecute() on-chain evaluation</div>
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-1.5">
            <span className="font-medium">3M U.S. Treasury Yield</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400 tracking-tight">
            {treasuryData.formattedYield}
          </div>
          <div className="text-[11px] text-gray-500 font-mono mt-1">
            {treasuryData.observationDate
              ? `As of ${treasuryData.observationDate} · U.S. Treasury`
              : 'Daily Treasury Par Yield Curve Rates'}
          </div>
        </div>
      </div>

      {/* 2. Live Protocol Status Banner */}
      <div className="flex items-center justify-between p-4 mb-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-emerald-400">ARBITRUM SEPOLIA PROTOCOL</span>
          <span className="text-gray-400">— Connected to live on-chain protocol contracts. RWA eligibility is enforced via RWAStateOracle.</span>
        </div>
        <div className="text-gray-500 font-mono shrink-0">Chain ID: 421614</div>
      </div>

      {/* 3. Main Operational Panels: Gate & RWA/Mandate details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <MainExecutionPanel onExecuted={refresh} />
        <div className="grid grid-cols-1 gap-6">
          <RwaStateCard />
          <MandateCard />
        </div>
      </div>

      {/* 4. Dedicated Core Visualizer: Authorization != Eligibility */}
      <div className="mb-8">
        <AuthorizationEligibilityCard />
      </div>

      {/* 5. Execution Operations Log */}
      <div className="mb-8">
        <TransactionHistory />
      </div>

      {/* 6. Technical Details Drawer (For judges and auditors) */}
      <div className="mb-8">
        <TechnicalDetailsDrawer />
      </div>
    </AppShell>
  );
}

"use client";

import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Landmark } from 'lucide-react';
import { useVault } from '@/hooks/useVault';
import { formatUnits } from 'viem';

export default function VaultPage() {
  const { isConnected, shareBalance, isBalanceLoading, portfolioAssets, isPortfolioLoading } = useVault();

  let tvlDisplay = 'Unavailable';
  let sharesDisplay = 'Connect wallet';

  if (!isConnected) {
    tvlDisplay = 'Unavailable';
    sharesDisplay = 'Connect wallet to view position';
  } else if (isBalanceLoading || isPortfolioLoading) {
    tvlDisplay = '...';
    sharesDisplay = 'Loading...';
  } else if (shareBalance !== undefined && portfolioAssets !== undefined) {
    const valNum = Number(formatUnits(portfolioAssets, 18));
    const sharesNum = Number(formatUnits(shareBalance, 18));
    tvlDisplay = '$' + valNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    sharesDisplay = sharesNum.toLocaleString(undefined, { maximumFractionDigits: 4 }) + ' USTB Shares';
  }

  return (
    <AppShell title="Vault" subtitle="TBillVault — Tokenized Treasury Exposure">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
        <div className="panel p-5">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
            <span>Portfolio Value</span>
            <Landmark className="h-4 w-4 text-[#28A0F0]" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1">{tvlDisplay}</div>
          <div className="text-[11px] text-gray-500 font-mono mt-1">{sharesDisplay}</div>
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
            <span>Vault Status</span>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">Active</div>
          <div className="text-[11px] text-gray-500 font-mono mt-1">TBillVault accepting deposits</div>
        </div>
      </div>

      <div className="panel p-5">
        <h2 className="text-sm font-semibold text-white mb-3">Vault Information</h2>
        <p className="text-xs text-gray-400 leading-relaxed">
          The TBillVault issues USTB testnet shares representing simulated tokenized Treasury exposure on Arbitrum Sepolia.
          Agent-mediated deposits and redemptions are evaluated by the RWA eligibility oracle and Agent Execution Gate, while delegated agent authority is constrained through EIP-712 mandates.
          Direct ERC-4626 vault interactions are not equivalent to gate-mediated agent operations.
          Production Treasury custody and settlement integration is not yet connected.
        </p>
        <div className="mt-4">
          <a href="/portfolio" className="text-[#28A0F0] text-xs hover:underline font-mono">
            → Open Portfolio Management
          </a>
        </div>
      </div>
    </AppShell>
  );
}

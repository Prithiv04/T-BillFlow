"use client";

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Wallet, Building2, CheckCircle2, Loader2 } from 'lucide-react';
import { useVault } from '@/hooks/useVault';
import { formatUnits, parseUnits } from 'viem';
import { usePublicClient } from 'wagmi';
import { useTreasuryYield } from '@/hooks/useTreasuryYield';
import { useLiveRwaState } from '@/hooks/useLiveRwaState';

export default function PortfolioPage() {
  const {
    isConnected,
    shareBalance,
    portfolioAssets,
    tbusdBalance,
    isBalanceLoading,
    isPortfolioLoading,
    deposit,
    redeem,
    approve,
    refetchAll,
  } = useVault();
  const publicClient = usePublicClient();
  const treasuryData = useTreasuryYield();
  const liveRwa = useLiveRwaState();
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<'idle' | 'pending' | 'success'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Derive on-chain values strictly (No mock seeds) ──────────────────────────
  let totalValueDisplay = 'Unavailable';
  let vaultSharesDisplay = 'Unavailable';
  let availableCashDisplay = 'Unavailable';
  let ustbNavDisplay = 'Unavailable';
  let ustbPositionValueDisplay = 'Unavailable';
  let ustbSharesTableDisplay = 'Unavailable';
  let ustbEligibility = 'UNAVAILABLE';
  let tbusdPositionValueDisplay = 'Unavailable';
  let tbusdSharesTableDisplay = 'Unavailable';

  if (!isConnected) {
    totalValueDisplay = 'Unavailable';
    vaultSharesDisplay = 'Unavailable';
    availableCashDisplay = 'Unavailable';
    ustbPositionValueDisplay = 'Unavailable';
    ustbSharesTableDisplay = 'Unavailable';
    tbusdPositionValueDisplay = 'Unavailable';
    tbusdSharesTableDisplay = 'Unavailable';
  } else if (isBalanceLoading || isPortfolioLoading) {
    totalValueDisplay = '...';
    vaultSharesDisplay = '...';
    availableCashDisplay = '...';
    ustbPositionValueDisplay = '...';
    ustbSharesTableDisplay = '...';
    tbusdPositionValueDisplay = '...';
    tbusdSharesTableDisplay = '...';
  } else {
    if (portfolioAssets !== undefined) {
      const val = Number(formatUnits(portfolioAssets, 18));
      totalValueDisplay = `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      ustbPositionValueDisplay = `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      totalValueDisplay = 'Unavailable';
      ustbPositionValueDisplay = 'Unavailable';
    }

    if (shareBalance !== undefined) {
      const shares = Number(formatUnits(shareBalance, 18));
      vaultSharesDisplay = `${shares.toLocaleString(undefined, { maximumFractionDigits: 4 })} T-BillFlow`;
      ustbSharesTableDisplay = shares.toLocaleString(undefined, { maximumFractionDigits: 4 });
    } else {
      vaultSharesDisplay = 'Unavailable';
      ustbSharesTableDisplay = 'Unavailable';
    }

    if (tbusdBalance !== undefined) {
      const cash = Number(formatUnits(tbusdBalance, 18));
      availableCashDisplay = `$${cash.toLocaleString(undefined, { maximumFractionDigits: 2 })} tBUSD`;
      tbusdPositionValueDisplay = `$${cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      tbusdSharesTableDisplay = cash.toLocaleString(undefined, { maximumFractionDigits: 2 });
    } else {
      availableCashDisplay = 'Unavailable';
      tbusdPositionValueDisplay = 'Unavailable';
      tbusdSharesTableDisplay = 'Unavailable';
    }
  }

  if (liveRwa.isError) {
    ustbNavDisplay = 'Unavailable';
    ustbEligibility = 'UNAVAILABLE';
  } else if (liveRwa.isLoading) {
    ustbNavDisplay = '...';
    ustbEligibility = 'CHECKING';
  } else {
    ustbNavDisplay = `$${(Number(liveRwa.nav) / 1e18).toFixed(4)}`;
    ustbEligibility =
      !liveRwa.isStale && liveRwa.redemptionOpen && liveRwa.liquidityTier >= 1
        ? 'ELIGIBLE'
        : 'BLOCKED';
  }

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    setErrorMsg(null);

    if (!isConnected) {
      setErrorMsg('Please connect your wallet first.');
      return;
    }

    setStatus('pending');
    try {
      if (activeTab === 'deposit') {
        const parsedAmount = parseUnits(amount, 18);
        const approveHash = await approve(parsedAmount);
        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }
        await deposit(parsedAmount);
      } else {
        const parsedShares = parseUnits(amount, 18);
        await redeem(parsedShares);
      }
      setStatus('success');
      refetchAll();
      setTimeout(() => {
        setStatus('idle');
        setAmount('');
      }, 2500);
    } catch (err: any) {
      console.error('Portfolio transaction failed:', err);
      setErrorMsg(err?.shortMessage || err?.message || 'Transaction failed');
      setStatus('idle');
    }
  };

  return (
    <AppShell
      title="Portfolio Management"
      subtitle="Institutional Vault Exposure & Tokenized Treasury Allocation"
    >
      {/* 1. Portfolio Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="panel p-4">
          <div className="text-gray-400 text-xs mb-1">Total Portfolio Value</div>
          <div className="text-xl font-bold font-mono text-white">
            {totalValueDisplay}
          </div>
          <div className="text-[10px] text-gray-500 font-mono mt-0.5">
            {isConnected ? 'ERC-4626 on-chain valuation' : 'Connect wallet to view position'}
          </div>
        </div>

        <div className="panel p-4">
          <div className="text-gray-400 text-xs mb-1">Vault Shares Owned</div>
          <div className="text-xl font-bold font-mono text-white">
            {vaultSharesDisplay}
          </div>
          <div className="text-[10px] text-gray-500 font-mono mt-0.5">
            {isConnected ? 'On-chain TBillVault balanceOf' : 'Connect wallet'}
          </div>
        </div>

        <div className="panel p-4">
          <div className="text-gray-400 text-xs mb-1">
            3M U.S. Treasury Yield
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {treasuryData.formattedYield}
          </div>
          <div className="text-[10px] text-gray-500 font-mono mt-0.5">
            {treasuryData.observationDate
              ? `As of ${treasuryData.observationDate} · U.S. Treasury`
              : 'Daily Treasury Par Yield Curve Rates'}
          </div>
        </div>

        <div className="panel p-4">
          <div className="text-gray-400 text-xs mb-1">Available Liquidity</div>
          <div className="text-xl font-bold font-mono text-white">
            {availableCashDisplay}
          </div>
          <div className="text-[10px] text-gray-500 font-mono mt-0.5">
            {isConnected ? 'On-chain tBUSD balance' : 'Connect wallet'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* 2. Asset Allocation Breakdown Table */}
        <div className="panel lg:col-span-2 p-5">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1E2229]">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-white tracking-tight">
                Vault Token Holdings
              </h2>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#181B20] text-gray-400 border border-[#2A303A]">
              TBillVault.sol
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs data-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Type</th>
                  <th>NAV</th>
                  <th>Position Value</th>
                  <th>Shares</th>
                  <th>Eligibility</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-semibold text-white">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span>USTB</span>
                    </div>
                  </td>
                  <td className="text-gray-400">T-BillFlow Vault Shares (tBUSD/Testnet)</td>
                  <td className="font-mono text-white">{ustbNavDisplay}</td>
                  <td className="font-mono text-white font-medium">
                    {ustbPositionValueDisplay}
                  </td>
                  <td className="font-mono text-gray-300">
                    {ustbSharesTableDisplay}
                  </td>
                  <td>
                    <span
                      className={`badge font-mono text-[10px] ${
                        ustbEligibility === 'ELIGIBLE'
                          ? 'badge-green'
                          : ustbEligibility === 'BLOCKED'
                          ? 'badge-red'
                          : 'badge-neutral'
                      }`}
                    >
                      {ustbEligibility}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="font-semibold text-white">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-blue-400" />
                      <span>tBUSD</span>
                    </div>
                  </td>
                  <td className="text-gray-400">Stable Settlement Reserve</td>
                  <td className="font-mono text-white">$1.0000 <span className="text-[10px] text-gray-500 font-sans">(Pegged)</span></td>
                  <td className="font-mono text-white font-medium">
                    {tbusdPositionValueDisplay}
                  </td>
                  <td className="font-mono text-gray-300">
                    {tbusdSharesTableDisplay}
                  </td>
                  <td>
                    <span className="badge badge-blue font-mono">
                      RESERVE
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-3.5 rounded-lg bg-[#0E1013] border border-[#1E2229] mt-4 flex items-center justify-between text-xs text-gray-400">
            <span>Direct ERC-4626 Mint & Redeem Boundary:</span>
            <span className="text-[11px] font-mono text-gray-300">
              Direct interaction follows vault rules; Agent execution gated by RWA eligibility.
            </span>
          </div>
        </div>

        {/* 3. Direct Vault Interaction Form */}
        <div className="panel p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1E2229]">
              <h2 className="text-sm font-semibold text-white tracking-tight">Direct Vault Actions</h2>
              <div className="flex rounded-md p-0.5 bg-[#0E1013] border border-[#1E2229]">
                <button
                  onClick={() => setActiveTab('deposit')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    activeTab === 'deposit'
                      ? 'bg-[#181B20] text-white border border-[#2A303A]'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Deposit
                </button>
                <button
                  onClick={() => setActiveTab('withdraw')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    activeTab === 'withdraw'
                      ? 'bg-[#181B20] text-white border border-[#2A303A]'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Redeem
                </button>
              </div>
            </div>

            <form onSubmit={handleAction} className="space-y-3">
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">
                  {activeTab === 'deposit' ? 'Deposit tBUSD Amount' : 'Redeem Shares Amount'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 50,000"
                    className="w-full px-3 py-2 rounded-md bg-[#0E1013] border border-[#1E2229] text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setAmount(activeTab === 'deposit' ? '50000' : '25000')}
                    className="absolute right-2 top-2 text-[10px] font-mono text-blue-400 hover:underline"
                  >
                    MAX
                  </button>
                </div>
              </div>

              <div className="p-2.5 rounded bg-[#0E1013] border border-[#1E2229] text-xs space-y-1 font-mono text-gray-400">
                <div className="flex justify-between">
                  <span>Exchange Rate:</span>
                  <span className="text-white">
                    {liveRwa.isError
                      ? 'Unavailable'
                      : `1 USTB = $${(Number(liveRwa.nav) / 1e18).toFixed(4)} tBUSD`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Protocol Fee:</span>
                  <span className="text-emerald-400">0.00% (No vault fee mechanism)</span>
                </div>
                <div className="flex justify-between">
                  <span>Settlement:</span>
                  <span className="text-gray-300">T+0 token settlement (on-chain only — not real Treasury settlement)</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={status === 'pending'}
                className="w-full py-2 px-3 rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-xs transition-colors flex items-center justify-center gap-1.5 mt-2"
              >
                {status === 'pending' ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Processing {activeTab === 'deposit' ? 'Deposit' : 'Redemption'}...</span>
                  </>
                ) : status === 'success' ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Transaction Confirmed</span>
                  </>
                ) : (
                  <span>Submit {activeTab === 'deposit' ? 'Deposit' : 'Redemption'} Request</span>
                )}
              </button>
              {errorMsg && (
                <div className="text-[11px] text-red-400 font-mono mt-1 text-center">
                  {errorMsg}
                </div>
              )}
            </form>
          </div>

          <div className="pt-3 border-t border-[#1E2229] text-[10px] text-gray-500 font-mono mt-4">
            Underlying: tBUSD (Arbitrum Sepolia Testnet settlement reserve) — Not real T-Bill custody.
          </div>
        </div>
      </div>
    </AppShell>
  );
}

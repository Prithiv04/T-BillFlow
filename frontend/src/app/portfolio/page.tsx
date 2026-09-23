"use client";

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Wallet, ArrowDownRight, ArrowUpRight, TrendingUp, Building2, CheckCircle2 } from 'lucide-react';
import { useMode } from '@/context/ModeContext';
import { useVault } from '@/hooks/useVault';
import { formatUnits } from 'viem';
import { APY, SHARE_RATE } from '@/lib/constants';

export default function PortfolioPage() {
  const { isDemo } = useMode();
  const { shareBalance, tvl } = useVault();
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const realShares = shareBalance ? parseFloat(formatUnits(shareBalance, 18)) : 0;
  const realTvl = tvl ? parseFloat(formatUnits(tvl, 18)) : 0;

  // Use realistic demo values or live values depending on mode
  const totalValue = isDemo ? 1284320 : realShares * SHARE_RATE;
  const vaultShares = isDemo ? 1281000 : realShares;
  const availableCash = isDemo ? 320000 : 50000;
  const currentApy = APY;

  const handleAction = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setAmount('');
    }, 2000);
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
            ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-gray-500 font-mono mt-0.5">Mark-to-market NAV valuation</div>
        </div>

        <div className="panel p-4">
          <div className="text-gray-400 text-xs mb-1">Vault Shares Owned</div>
          <div className="text-xl font-bold font-mono text-white">
            {vaultShares.toLocaleString(undefined, { maximumFractionDigits: 2 })} T-BillFlow
          </div>
          <div className="text-[10px] text-gray-500 font-mono mt-0.5">ERC-4626 Share balance</div>
        </div>

        <div className="panel p-4">
          <div className="text-gray-400 text-xs mb-1">Current Yield (APY)</div>
          <div className="text-xl font-bold font-mono text-emerald-400">{currentApy}%</div>
          <div className="text-[10px] text-gray-500 font-mono mt-0.5">US Treasury Bill benchmark</div>
        </div>

        <div className="panel p-4">
          <div className="text-gray-400 text-xs mb-1">Available Liquidity</div>
          <div className="text-xl font-bold font-mono text-white">
            ${availableCash.toLocaleString(undefined, { maximumFractionDigits: 0 })} tBUSD
          </div>
          <div className="text-[10px] text-gray-500 font-mono mt-0.5">Instant settlement reserve</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* 2. Asset Allocation Breakdown Table */}
        <div className="panel lg:col-span-2 p-5">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1E2229]">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-white tracking-tight">
                RWA Treasury Holdings
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
                  <td className="text-gray-400">US Treasury Bill (3M)</td>
                  <td className="font-mono text-white">$1.0002</td>
                  <td className="font-mono text-white font-medium">
                    ${(vaultShares * 1.0002).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                  <td className="font-mono text-gray-300">
                    {vaultShares.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                  <td>
                    <span className="badge badge-green font-mono">
                      ELIGIBLE
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
                  <td className="font-mono text-white">$1.0000</td>
                  <td className="font-mono text-white font-medium">
                    ${availableCash.toLocaleString()}
                  </td>
                  <td className="font-mono text-gray-300">
                    {availableCash.toLocaleString()}
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
                  <span className="text-white">1 USTB = {SHARE_RATE.toFixed(4)} tBUSD</span>
                </div>
                <div className="flex justify-between">
                  <span>Protocol Fee:</span>
                  <span className="text-emerald-400">0.00%</span>
                </div>
                <div className="flex justify-between">
                  <span>Settlement:</span>
                  <span className="text-gray-300">T+0 Instant</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 px-3 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors flex items-center justify-center gap-1.5 mt-2"
              >
                {submitted ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Transaction Confirmed</span>
                  </>
                ) : (
                  <span>Submit {activeTab === 'deposit' ? 'Deposit' : 'Redemption'} Request</span>
                )}
              </button>
            </form>
          </div>

          <div className="pt-3 border-t border-[#1E2229] text-[10px] text-gray-500 font-mono mt-4">
            Underlying RWA: 3-Month US Treasury Bills via Arbitrum Sepolia
          </div>
        </div>
      </div>
    </AppShell>
  );
}

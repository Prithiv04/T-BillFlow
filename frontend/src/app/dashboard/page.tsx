"use client";

import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import NumberTicker from "@/components/NumberTicker";
import { ArrowRight, TrendingUp, Wallet, BarChart3, ExternalLink } from "lucide-react";
import { APY, BSCSCAN_BASE, TBILLFLOW_CONTRACT, SHARE_RATE } from "@/lib/constants";
import { useVault } from "@/hooks/useVault";
import { formatUnits } from "viem";
import { RwaStateCard } from "@/components/RwaStateCard";
import { MandateCard } from "@/components/MandateCard";
import { ExecutionGatePreview } from "@/components/ExecutionGatePreview";
import { TransactionHistory } from "@/components/TransactionHistory";

export default function DashboardPage() {
  const { isConnected, address } = useAccount();
  const { shareBalance, tvl } = useVault();

  const userShares = shareBalance ? parseFloat(formatUnits(shareBalance, 18)) : 0;
  const userUsdBalance = userShares * SHARE_RATE;
  // Real yield = appreciation above 1:1 mint price (share price > 1 tBUSD = profit)
  const yieldEarned = userShares > 0 ? userUsdBalance - userShares : 0;

  const tvlUsd = tvl ? parseFloat(formatUnits(tvl, 18)) : 0;

  if (!isConnected) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 pt-16 px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F0B90B]/10">
          <Wallet className="h-8 w-8 text-[#F0B90B]" />
        </div>
        <h1 className="text-3xl font-bold">Connect Your Wallet</h1>
        <p className="max-w-sm text-gray-400">
          Connect your wallet to view your T-BillFlow dashboard and manage your positions.
        </p>
        <ConnectButton />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pt-24 pb-16">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-400">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </p>
          </div>
          <a
            href={`${BSCSCAN_BASE}/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-[#F0B90B]"
          >
            View on BscScan <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
          <div className="card-glass rounded-2xl p-6">
            <div className="mb-2 flex items-center gap-2 text-sm text-gray-400">
              <Wallet className="h-4 w-4" /> Portfolio Value
            </div>
            <div className="text-3xl font-bold">
              $<NumberTicker value={userUsdBalance} decimals={2} animate={true} />
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {userShares.toFixed(4)} T-BillFlow Shares
            </div>
          </div>

          <div className="card-glass rounded-2xl p-6">
            <div className="mb-2 flex items-center gap-2 text-sm text-gray-400">
              <TrendingUp className="h-4 w-4" /> Total Yield Earned
            </div>
            <div className="text-3xl font-bold text-[#F0B90B]">
              $<NumberTicker value={yieldEarned} decimals={4} animate={true} className="text-[#F0B90B]" />
            </div>
            <div className="mt-1 text-xs text-[#F0B90B]/70">Live accrual ↑</div>
          </div>

          <div className="card-glass rounded-2xl p-6">
            <div className="mb-2 flex items-center gap-2 text-sm text-gray-400">
              <BarChart3 className="h-4 w-4" /> Current APY
            </div>
            <div className="text-3xl font-bold text-gradient">{APY}%</div>
            <div className="mt-1 text-xs text-gray-500">US Treasury Bill rate</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-8">
          <Link
            href="/deposit"
            className="card-glass rounded-2xl p-6 flex items-center justify-between group hover:border-[#F0B90B]/40 transition-colors"
          >
            <div>
              <div className="text-lg font-semibold">Deposit tBUSD</div>
              <div className="mt-1 text-sm text-gray-400">Mint new T-BillFlow Shares</div>
            </div>
            <ArrowRight className="h-5 w-5 text-[#F0B90B] group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/deposit?tab=withdraw"
            className="card-glass rounded-2xl p-6 flex items-center justify-between group hover:border-[#F0B90B]/40 transition-colors"
          >
            <div>
              <div className="text-lg font-semibold">Withdraw</div>
              <div className="mt-1 text-sm text-gray-400">Redeem shares for tBUSD</div>
            </div>
            <ArrowRight className="h-5 w-5 text-[#F0B90B] group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Protocol Stats */}
        <div className="card-glass rounded-2xl p-6">
          <h2 className="mb-4 text-lg font-semibold">Protocol Stats</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "TVL", value: `$${tvlUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
              { label: "Share Price", value: `${SHARE_RATE.toFixed(4)} tBUSD` },
              { label: "Total Shares", value: (tvlUsd / SHARE_RATE).toLocaleString(undefined, { maximumFractionDigits: 0 }) },
              { label: "Shareholders", value: (tvlUsd / SHARE_RATE) > 0 ? "1" : "0" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-xs text-gray-500">{s.label}</div>
                <div className="mt-1 font-semibold text-white">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 mt-8">
          <RwaStateCard />
          <MandateCard />
          <ExecutionGatePreview />
          <TransactionHistory />
        </div>

        </div>
      </div>
  );
}

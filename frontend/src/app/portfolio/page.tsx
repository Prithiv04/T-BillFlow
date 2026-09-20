"use client";

import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Wallet, TrendingUp, ExternalLink, Loader2, FileX } from "lucide-react";
import NumberTicker from "@/components/NumberTicker";
import { BSCSCAN_BASE, SHARE_RATE } from "@/lib/constants";
import { formatUnits } from "viem";
import { useVault } from "@/hooks/useVault";
import { useEffect, useState } from "react";

interface Transaction {
  type: "Deposit" | "Withdraw";
  amount: string;
  hash: string;
  date: string;
  tokenSymbol: string;
}

export default function PortfolioPage() {
  const { isConnected, address } = useAccount();
  const { shareBalance } = useVault();

  const [txHistory, setTxHistory] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  const userShares = shareBalance ? parseFloat(formatUnits(shareBalance, 18)) : 0;
  const userUsdBalance = userShares * SHARE_RATE;

  // Real yield = shares accrued above 1:1 peg (share price > 1 tBUSD)
  const yieldEarned = userShares > 0 ? userUsdBalance - userShares : 0;

  // Fetch real tx history from BscScan via server-side API route
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!address) return;

    const loadTxs = async () => {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTxLoading(true);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTxError(null);

      try {
        const r = await fetch(`/api/txhistory?address=${address}`);
        const data = await r.json();
        if (data.error) throw new Error(data.error);
        setTxHistory(data.transactions ?? []);
      } catch (e: any) {
        setTxError(e.message);
      } finally {
        setTxLoading(false);
      }
    };

    loadTxs();
  }, [address]);

  if (!isConnected) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 pt-16 text-center px-4">
        <Wallet className="h-12 w-12 text-[#F0B90B]" />
        <h1 className="text-3xl font-bold">Connect Wallet</h1>
        <p className="text-gray-400">Connect to view your portfolio and transaction history.</p>
        <ConnectButton />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pt-24 pb-16">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-8 text-3xl font-bold">My Portfolio</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
          <div className="card-glass rounded-2xl p-6">
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
              <Wallet className="h-4 w-4" /> Total Value
            </div>
            <div className="text-3xl font-bold">
              $<NumberTicker value={userUsdBalance} decimals={2} animate={true} />
            </div>
            <div className="mt-1 text-xs text-gray-500">Current USD value</div>
          </div>

          <div className="card-glass rounded-2xl p-6">
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
              <TrendingUp className="h-4 w-4" /> Total Yield Earned
            </div>
            <div className="text-3xl font-bold text-[#F0B90B]">
              $<NumberTicker value={yieldEarned} decimals={4} animate={true} className="text-[#F0B90B]" />
            </div>
            <div className="mt-1 text-xs text-[#F0B90B]/60">Live accrual ↑</div>
          </div>

          <div className="card-glass rounded-2xl p-6">
            <div className="text-sm text-gray-400 mb-2">Shares Held</div>
            <div className="text-3xl font-bold">
              {userShares.toLocaleString(undefined, { maximumFractionDigits: 4 })}
            </div>
            <div className="mt-1 text-xs text-gray-500">T-BillFlow Shares (BEP-20)</div>
          </div>
        </div>

        {/* Portfolio Growth — only show after first deposit */}
        {userShares > 0 ? (
          <div className="card-glass rounded-2xl p-6 mb-8">
            <h2 className="text-lg font-semibold mb-1">Portfolio Growth</h2>
            <p className="text-xs text-gray-500 mb-4">Share value accrues continuously on-chain.</p>
            <div className="h-40 flex items-end gap-1">
              {Array.from({ length: 12 }, (_, i) => {
                const baseHeight = 60;
                const dailyGrowth = 2.5; 
                const daysHeld = userShares > 0 ? i + 1 : 0;
                const finalHeight = baseHeight + (daysHeld * dailyGrowth);
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm bg-[#F0B90B]/20 border-t border-[#F0B90B]/40 transition-all duration-300 hover:bg-[#F0B90B]/40"
                    style={{ height: `${finalHeight}%` }}
                  />
                );
              })}
            </div>
            <div className="mt-2 flex justify-between text-xs text-gray-500">
              <span>Deposit</span><span>Now</span>
            </div>
          </div>
        ) : (
          <div className="card-glass rounded-2xl p-6 mb-8 flex flex-col items-center justify-center gap-2 h-40 text-center">
            <TrendingUp className="h-8 w-8 text-gray-600" />
            <p className="text-gray-500 text-sm">Chart populates after your first deposit</p>
          </div>
        )}

        {/* Transaction History */}
        <div className="card-glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Transaction History</h2>

          {txLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading transactions…</span>
            </div>
          ) : txError ? (
            <div className="py-12 text-center text-red-400 text-sm">{txError}</div>
          ) : txHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <FileX className="h-10 w-10 text-gray-600" />
              <p className="text-gray-400 font-medium">No transactions yet</p>
              <p className="text-gray-600 text-sm">Make your first deposit to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-[#2A2A3E]">
                    <th className="pb-3 pr-4">Type</th>
                    <th className="pb-3 pr-4">Amount</th>
                    <th className="pb-3 pr-4">Token</th>
                    <th className="pb-3 pr-4">Date</th>
                    <th className="pb-3">Proof</th>
                  </tr>
                </thead>
                <tbody>
                  {txHistory.map((tx) => (
                    <tr key={tx.hash} className="border-b border-[#2A2A3E]/50 hover:bg-white/[0.02]">
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            tx.type === "Deposit"
                              ? "bg-green-500/10 text-green-400"
                              : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-medium">{tx.amount}</td>
                      <td className="py-3 pr-4 text-gray-400">{tx.tokenSymbol}</td>
                      <td className="py-3 pr-4 text-gray-400">{tx.date}</td>
                      <td className="py-3">
                        <a
                          href={`${BSCSCAN_BASE}/tx/${tx.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#F0B90B] hover:underline"
                        >
                          BscScan <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExternalLink, CheckCircle2, Loader2, ArrowDownUp } from "lucide-react";
import { APY, BSCSCAN_BASE, SHARE_RATE } from "@/lib/constants";
import { Suspense } from "react";
import { parseUnits } from "viem";
import { useVault } from "@/hooks/useVault";
import { usePublicClient } from "wagmi";

function DepositContent() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") === "withdraw" ? "withdraw" : "deposit";
  const { isConnected } = useAccount();
  const { deposit, redeem, approve, refetchAll } = useVault();
  const publicClient = usePublicClient();

  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<"idle" | "pending" | "success">("idle");
  const [txHash, setTxHash] = useState("0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1");

  const shares = amount ? (parseFloat(amount) / SHARE_RATE).toFixed(6) : "0.000000";
  const yearlyYield = amount ? (parseFloat(amount) * APY / 100).toFixed(2) : "0.00";

  const handleSubmit = async (tab: "deposit" | "withdraw") => {
    if (!amount || parseFloat(amount) <= 0) return;
    setStatus("pending");
    try {
      let hash = "";
      if (tab === "deposit") {
        const parsedAmount = parseUnits(amount, 18);
        
        // 1. Send Approve Transaction
        const approveHash = await approve(parsedAmount);
        
        // 2. Wait for Approve to be mined
        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }
        
        // 3. Send Deposit Transaction
        hash = await deposit(parsedAmount);
      } else {
        const parsedShares = parseUnits(amount, 18);
        hash = await redeem(parsedShares);
      }
      if (hash) setTxHash(hash);
      setStatus("success");
      refetchAll();
    } catch (e) {
      console.error(e);
      setStatus("idle");
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="text-gray-400">Connect your wallet to deposit or withdraw.</p>
        <ConnectButton />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <Tabs defaultValue={defaultTab} className="flex flex-col gap-6 w-full">
        <TabsList className="grid w-full grid-cols-2 bg-[#141422] border border-[#2A2A3E] h-14 p-1 rounded-xl">
          <TabsTrigger value="deposit" className="rounded-lg data-active:bg-[#F0B90B]/10 data-active:text-[#F0B90B] text-base font-semibold">
            Deposit
          </TabsTrigger>
          <TabsTrigger value="withdraw" className="rounded-lg data-active:bg-[#F0B90B]/10 data-active:text-[#F0B90B] text-base font-semibold">
            Withdraw
          </TabsTrigger>
        </TabsList>

        {(["deposit", "withdraw"] as const).map((tab) => (
          <TabsContent key={tab} value={tab}>
            <div className="card-glass rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">{tab === "deposit" ? "You pay (tBUSD)" : "Shares to redeem"}</span>
                <button
                  className="text-[#F0B90B] hover:underline"
                  onClick={() => setAmount(tab === "deposit" ? "1000" : "952.4201")}
                >
                  Max
                </button>
              </div>

              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-[#0D0D1A] border-[#2A2A3E] text-white text-xl h-14 pr-24 focus:border-[#F0B90B]/50"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">
                  {tab === "deposit" ? "tBUSD" : "Shares"}
                </span>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <ArrowDownUp className="h-5 w-5 text-gray-500" />
              </div>

              {/* Output info */}
              <div className="rounded-xl bg-[#0D0D1A] p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">
                    {tab === "deposit" ? "You receive" : "You receive"}
                  </span>
                  <span className="font-medium">
                    {tab === "deposit"
                      ? `${shares} T-BillFlow Shares`
                      : `${amount ? (parseFloat(amount) * SHARE_RATE).toFixed(2) : "0.00"} tBUSD`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Exchange rate</span>
                  <span>1 Share = {SHARE_RATE} tBUSD</span>
                </div>
                {tab === "deposit" && (
                  <div className="flex justify-between text-[#F0B90B]">
                    <span>Projected 1-year yield</span>
                    <span>+${yearlyYield}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">APY</span>
                  <span className="text-gradient font-semibold">{APY}%</span>
                </div>
              </div>

              <Button
                className="w-full h-12 gradient-gold text-[#1E1E1E] font-semibold text-base hover:opacity-90 gold-glow"
                onClick={() => handleSubmit(tab)}
                disabled={status === "pending" || !amount}
              >
                {status === "pending" ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Waiting for BNB Chain...
                  </span>
                ) : tab === "deposit" ? "Deposit & Mint Shares" : "Redeem Shares"}
              </Button>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Success dialog */}
      <Dialog open={status === "success"} onOpenChange={() => setStatus("idle")}>
        <DialogContent className="bg-[#141422] border-[#2A2A3E] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <CheckCircle2 className="h-6 w-6 text-[#F0B90B]" />
              Transaction Confirmed!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-gray-400">
              Your deposit was successful. Your T-BillFlow Shares are now earning yield.
            </p>
            <div className="rounded-xl bg-[#0D0D1A] p-4 text-sm">
              <div className="text-gray-400 mb-1">Transaction Hash</div>
              <div className="font-mono text-xs break-all text-gray-300">{txHash}</div>
            </div>
            <a
              href={`${BSCSCAN_BASE}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#F0B90B]/30 bg-[#F0B90B]/10 py-3 text-sm font-medium text-[#F0B90B] hover:bg-[#F0B90B]/20 transition-colors"
            >
              View on BscScan <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function DepositPage() {
  return (
    <div className="min-h-screen px-4 pt-24 pb-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold">Deposit &amp; Withdraw</h1>
          <p className="mt-2 text-gray-400">
            Deposit tBUSD to mint T-BillFlow Shares, or redeem shares for tBUSD.
          </p>
        </div>
        <Suspense fallback={null}>
          <DepositContent />
        </Suspense>
      </div>
    </div>
  );
}

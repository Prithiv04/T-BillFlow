"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExternalLink, CheckCircle2, Loader2 } from "lucide-react";
import { APY, SHARE_RATE } from "@/lib/constants";
import { Suspense } from "react";
import { parseUnits } from "viem";
import { useVault } from "@/hooks/useVault";
import { usePublicClient } from "wagmi";
import { AppShell } from "@/components/layout/AppShell";

function DepositContent() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") === "withdraw" ? "withdraw" : "deposit";
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
        const approveHash = await approve(parsedAmount);
        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }
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

  return (
    <div className="panel max-w-xl mx-auto p-6">
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 bg-[#0E1013] border border-[#1E2229]">
          <TabsTrigger value="deposit" className="text-xs">Deposit tBUSD</TabsTrigger>
          <TabsTrigger value="withdraw" className="text-xs">Redeem Shares</TabsTrigger>
        </TabsList>

        {(["deposit", "withdraw"] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-400 block mb-1">
                {tab === "deposit" ? "Amount to Deposit (tBUSD)" : "Shares to Redeem"}
              </label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-[#0E1013] border-[#1E2229] text-white font-mono text-sm pr-16"
                  disabled={status === "pending"}
                />
                <button
                  type="button"
                  onClick={() => setAmount("1000")}
                  className="absolute right-3 top-2.5 text-xs text-blue-400 font-mono hover:underline"
                >
                  MAX
                </button>
              </div>
            </div>

            <div className="rounded-lg bg-[#0E1013] border border-[#1E2229] p-3 text-xs space-y-1.5 font-mono text-gray-400">
              <div className="flex justify-between">
                <span>{tab === "deposit" ? "Shares to Receive:" : "tBUSD to Receive:"}</span>
                <span className="text-white font-medium">{shares}</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Yield:</span>
                <span className="text-emerald-400">~${yearlyYield} / year ({APY}%)</span>
              </div>
              <div className="flex justify-between">
                <span>Settlement Speed:</span>
                <span className="text-gray-300">T+0 Instant</span>
              </div>
            </div>

            <Button
              onClick={() => handleSubmit(tab)}
              disabled={status === "pending" || !amount || parseFloat(amount) <= 0}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs py-2.5"
            >
              {status === "pending" ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing transaction...
                </span>
              ) : tab === "deposit" ? (
                "Deposit & Mint Shares"
              ) : (
                "Redeem Shares"
              )}
            </Button>
          </TabsContent>
        ))}
      </Tabs>

      {/* Success Dialog */}
      <Dialog open={status === "success"} onOpenChange={() => setStatus("idle")}>
        <DialogContent className="bg-[#121418] border-[#1E2229] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              Transaction Confirmed
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <p className="text-gray-400">
              Your transaction was successfully processed by TBillVault.
            </p>
            <div className="rounded bg-[#0A0B0D] p-3 border border-[#1E2229] font-mono">
              <div className="text-gray-500 text-[10px] mb-0.5">Tx Hash</div>
              <div className="text-gray-300 text-xs break-all">{txHash}</div>
            </div>
            <a
              href={`https://sepolia.arbiscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded bg-[#181B20] border border-[#2A303A] py-2 text-xs text-blue-400 hover:text-white transition-colors"
            >
              View on Arbiscan <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function DepositPage() {
  return (
    <AppShell
      title="Direct Vault Interactions"
      subtitle="ERC-4626 Direct Mint & Redemption for Authorized Liquidity Providers"
    >
      <Suspense fallback={null}>
        <DepositContent />
      </Suspense>
    </AppShell>
  );
}

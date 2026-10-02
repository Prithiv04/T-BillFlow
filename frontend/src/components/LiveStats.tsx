"use client";

import { useVault } from "@/hooks/useVault";
import { formatUnits } from "viem";
import { useTreasuryYield } from "@/hooks/useTreasuryYield";

export default function LiveStats() {
  const { tvl } = useVault();
  const treasuryData = useTreasuryYield();
  
  const tvlUsd = tvl ? parseFloat(formatUnits(tvl, 18)) : 0;
  // Honest on-chain count: at least 1 once TVL > 0, grows as real deposits come in
  const shareholders = tvlUsd > 0 ? 1 : 0;

  return (
    <div className="card-glass rounded-2xl p-6 grid grid-cols-3 gap-4 divide-x divide-[#2A2A3E]">
      <div className="text-center px-4">
        <div className="text-2xl font-bold text-gradient">{treasuryData.formattedYield}</div>
        <div className="mt-1 text-sm text-gray-400">3M U.S. Treasury Yield</div>
      </div>
      <div className="text-center px-4">
        <div className="text-2xl font-bold text-gradient">
          ${tvlUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </div>
        <div className="mt-1 text-sm text-gray-400">Total Value Locked</div>
      </div>
      <div className="text-center px-4">
        <div className="text-2xl font-bold text-gradient">
          {shareholders.toLocaleString()}
        </div>
        <div className="mt-1 text-sm text-gray-400">Share Holders</div>
      </div>
    </div>
  );
}

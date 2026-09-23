"use client";

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Settings, Copy, Check, ExternalLink, ShieldCheck } from 'lucide-react';
import { ADDRESSES, CHAIN_ID } from '@/config';
import { EXPLORER_URL, RPC_URL } from '@/lib/constants';

export default function SettingsPage() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const configs = [
    { label: 'Target Network', value: `Arbitrum Sepolia (Chain ID ${CHAIN_ID})` },
    { label: 'Public RPC Endpoint', value: RPC_URL },
    { label: 'Block Explorer', value: EXPLORER_URL },
    { label: 'AgentExecutionGate', value: ADDRESSES.gate },
    { label: 'AgentMandateRegistry', value: ADDRESSES.registry },
    { label: 'RWAStateOracle', value: ADDRESSES.oracle },
    { label: 'TBillVault', value: ADDRESSES.vault },
  ];

  return (
    <AppShell
      title="System Settings & Infrastructure"
      subtitle="Network Parameters, Contract Registries & Connectivity"
    >
      <div className="panel max-w-3xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-[#1E2229]">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-white">Arbitrum Sepolia Deployment Manifest</h2>
          </div>
          <span className="badge badge-green font-mono text-[10px]">
            <ShieldCheck className="h-3 w-3" />
            Verified
          </span>
        </div>

        <div className="space-y-3 font-mono text-xs">
          {configs.map((cfg) => (
            <div
              key={cfg.label}
              className="p-3 rounded-lg bg-[#0E1013] border border-[#1E2229] flex items-center justify-between"
            >
              <div>
                <span className="text-[10px] text-gray-500 uppercase block">{cfg.label}</span>
                <span className="text-gray-200 text-xs break-all">{cfg.value}</span>
              </div>
              <button
                onClick={() => handleCopy(cfg.value, cfg.label)}
                className="p-1.5 rounded hover:bg-[#181B20] text-gray-400 hover:text-white shrink-0 ml-3"
              >
                {copiedKey === cfg.label ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

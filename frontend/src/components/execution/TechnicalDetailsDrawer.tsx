"use client";

import React, { useState } from 'react';
import { Code2, ChevronDown, ChevronUp, Copy, Check, ExternalLink } from 'lucide-react';
import { ADDRESSES, CHAIN_ID } from '@/config';
import { BSCSCAN_BASE } from '@/lib/constants';

interface TechnicalDetailsProps {
  txHash?: string;
  blockNumber?: number;
  mandateId?: string;
  target?: string;
  selector?: string;
  asset?: string;
  action?: string;
  amount?: string | number;
}

export function TechnicalDetailsDrawer({
  txHash = '0x330d9e63a14e9f50bc7829a1b41dc95852...',
  blockNumber = 14829104,
  mandateId = '0x0000000000000000000000000000000000000000000000000000000000000001',
  target = ADDRESSES.vault,
  selector = '0xb6b55f25 (deposit(uint256,address))',
  asset = 'USTB (Simulated US Treasury)',
  action = '0 (DEPOSIT)',
  amount = '250,000 tBUSD (250000000000000000000000)',
}: TechnicalDetailsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const fields = [
    { label: 'Network', value: `Arbitrum Sepolia (Chain ID ${CHAIN_ID})` },
    { label: 'AgentExecutionGate', value: ADDRESSES.gate },
    { label: 'AgentMandateRegistry', value: ADDRESSES.registry },
    { label: 'RWAStateOracle', value: ADDRESSES.oracle },
    { label: 'TBillVault (Target)', value: target },
    { label: 'Mandate ID', value: mandateId },
    { label: 'Calldata Selector', value: selector },
    { label: 'Underlying Asset', value: asset },
    { label: 'Proposed Action', value: action },
    { label: 'Execution Amount', value: String(amount) },
    { label: 'Block Number', value: String(blockNumber) },
    { label: 'Tx Hash', value: txHash },
  ];

  return (
    <div className="border border-[#1E2229] rounded-lg bg-[#0E1013] overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-mono text-gray-400 hover:text-gray-200 transition-colors bg-[#121418]"
      >
        <span className="flex items-center gap-2">
          <Code2 className="h-3.5 w-3.5 text-blue-400" />
          <span>Technical Execution Details & Verification</span>
        </span>
        <span className="flex items-center gap-1 text-[11px] text-gray-500">
          {isOpen ? 'Hide' : 'Inspect Call Payload'}
          {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </span>
      </button>

      {isOpen && (
        <div className="p-4 border-t border-[#1E2229] space-y-2 text-xs font-mono">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {fields.map((field) => (
              <div
                key={field.label}
                className="p-2 rounded bg-[#0A0B0D] border border-[#1E2229] flex items-center justify-between group"
              >
                <div className="overflow-hidden mr-2">
                  <span className="text-[10px] uppercase text-gray-500 block">
                    {field.label}
                  </span>
                  <span className="text-gray-300 text-[11px] truncate block">
                    {field.value}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(field.value, field.label)}
                  className="p-1 rounded text-gray-500 hover:text-white shrink-0"
                  title="Copy"
                >
                  {copiedKey === field.label ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" />
                  )}
                </button>
              </div>
            ))}
          </div>

          <div className="pt-2 text-[10px] text-gray-500 flex items-center justify-between">
            <span>Invariants verified: asset == mandate.asset && selector == requestedSelector</span>
            {txHash && (
              <a
                href={`https://sepolia.arbiscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline flex items-center gap-1"
              >
                View on Arbiscan <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Bot,
  Loader2,
  ExternalLink,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { useLiveGate, TxStatus } from '@/hooks/useLiveGate';
import { useNetworkGuard } from '@/hooks/useNetworkGuard';
import { useAccount } from 'wagmi';
import { DEFAULT_MANDATE_ID } from '@/lib/constants';

interface MainExecutionPanelProps {
  onExecuted?: () => void;
}

export function MainExecutionPanel({ onExecuted }: MainExecutionPanelProps) {
  const { isConnected } = useAccount();
  const { isCorrectNetwork } = useNetworkGuard();
  const {
    canExecute,
    gateReason,
    isSimulating,
    txStatus,
    txHash,
    txError,
    explorerUrl,
    executeDeposit,
    reset,
    isPaused,
  } = useLiveGate(DEFAULT_MANDATE_ID);

  // 250,000 MockUSDC (6 decimals)
  const DEPOSIT_AMOUNT = 250_000_000_000n;

  const handleExecute = async () => {
    await executeDeposit(DEPOSIT_AMOUNT);
    if (txStatus === 'confirmed') {
      onExecuted?.();
    }
  };

  const txStatusLabel: Record<TxStatus, string> = {
    idle:      '',
    preparing: 'Preparing transaction...',
    signing:   'Sign in your wallet...',
    pending:   'Broadcasting to Arbitrum Sepolia...',
    confirmed: 'Transaction confirmed!',
    failed:    'Transaction failed',
  };

  const isBlockedByNetwork = !isCorrectNetwork && isConnected;
  const isExecuting = ['preparing', 'signing', 'pending'].includes(txStatus);
  const isConfirmed = txStatus === 'confirmed';
  const isFailed    = txStatus === 'failed';

  return (
    <div className="panel p-5 flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1E2229]">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-white tracking-tight">
              Agent Execution Gate
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              LIVE — Arbitrum Sepolia
            </span>
            {isPaused && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400">
                GATE PAUSED
              </span>
            )}
          </div>
        </div>

        {/* Live Request Preview */}
        <div className="p-4 rounded-lg bg-[#0E1013] border border-[#252A34] mb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2.5 mb-3 border-b border-[#1E2229]">
            <div>
              <div className="text-xs font-bold text-white tracking-wide uppercase flex items-center gap-2">
                Protocol Verification Request
                <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 normal-case">
                  Verification Test
                </span>
              </div>
              <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                On-Chain Execution Request (Fixed Gate Test Payload)
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-2 rounded bg-[#13171F] border border-[#1E2229]">
              <span className="text-gray-500 block text-[10px] uppercase font-mono mb-0.5">Action</span>
              <span className="font-mono font-semibold text-white">DEPOSIT</span>
            </div>
            <div className="p-2 rounded bg-[#13171F] border border-[#1E2229]">
              <span className="text-gray-500 block text-[10px] uppercase font-mono mb-0.5">Test Payload</span>
              <span className="font-mono font-semibold text-amber-300">
                250,000 tBUSD · Test Payload
              </span>
            </div>
            <div className="p-2 rounded bg-[#13171F] border border-[#1E2229]">
              <span className="text-gray-500 block text-[10px] uppercase font-mono mb-0.5">Route</span>
              <span className="font-mono font-semibold text-white">AgentExecutionGate</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#1E2229] flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-gray-400">
            <span>Target: TBillVault · Selector: deposit(uint256,address)</span>
            <span className="text-gray-400 bg-[#161A22] px-2 py-0.5 rounded border border-[#252A34]">
              Simulated verification payload · Not real investment
            </span>
          </div>
        </div>

        {/* Wallet Status */}
        {!isConnected && (
          <div className="p-3.5 rounded-lg bg-blue-500/10 border border-blue-500/25 text-blue-400 text-xs mb-4 flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Connect your wallet to interact with live contracts.</span>
          </div>
        )}

        {isBlockedByNetwork && (
          <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs mb-4 flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Switch your wallet to <strong>Arbitrum Sepolia</strong> to execute.</span>
          </div>
        )}

        {/* Gate evaluation result */}
        <div className="mb-5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Gate Evaluation — canExecuteAs()
          </div>
          <div className={`p-3.5 rounded-lg border text-xs font-mono flex items-center gap-2.5 ${
            isSimulating
              ? 'bg-[#121418] border-[#1E2229] text-gray-400'
              : canExecute
              ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
          }`}>
            {isSimulating
              ? <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              : canExecute
              ? <CheckCircle2 className="h-4 w-4 shrink-0" />
              : <ShieldAlert className="h-4 w-4 shrink-0" />
            }
            <span className="font-semibold">{isSimulating ? 'Querying on-chain gate...' : gateReason || 'Unavailable'}</span>
          </div>
        </div>
      </div>

      {/* Action area */}
      <div className="pt-4 border-t border-[#1E2229] mt-auto space-y-3.5">
        {/* Tx status bar */}
        {txStatus !== 'idle' && (
          <div className={`p-3 rounded-lg border text-xs font-mono flex items-center justify-between gap-2 ${
            isConfirmed
              ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
              : isFailed
              ? 'bg-rose-500/10 border-rose-500/25 text-rose-400'
              : 'bg-blue-500/10 border-blue-500/25 text-blue-400'
          }`}>
            <div className="flex items-center gap-2">
              {isExecuting
                ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                : isConfirmed
                ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                : <XCircle className="h-3.5 w-3.5 shrink-0" />
              }
              <span>{txStatusLabel[txStatus]}</span>
              {txError && <span className="text-rose-300 text-[10px] ml-1">{txError}</span>}
            </div>
            <div className="flex items-center gap-2">
              {explorerUrl && txHash && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-400 hover:underline text-[10px]"
                >
                  <span className="font-mono">{txHash.slice(0, 10)}...</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {(isConfirmed || isFailed) && (
                <button onClick={reset} className="text-[10px] text-gray-400 hover:text-white">
                  Reset
                </button>
              )}
            </div>
          </div>
        )}

        {/* Decision Banner */}
        {canExecute ? (
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="font-mono font-bold text-sm text-emerald-400 tracking-wide">
                  EXECUTION READY
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-semibold">
                Gate Passed
              </span>
            </div>
            <p className="text-[11px] text-emerald-300/80 leading-relaxed">
              All mandate authorizations and RWA eligibility constraints satisfied on Arbitrum Sepolia.
            </p>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0" />
                <span className="font-mono font-bold text-sm text-rose-400 tracking-wide">
                  EXECUTION BLOCKED
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/60 border border-rose-500/40 text-rose-300 font-semibold">
                Gate Reverted
              </span>
            </div>
            <div className="p-2 rounded bg-[#0A0D12] border border-rose-500/20 font-mono text-xs flex items-center gap-2">
              <span className="text-gray-400 text-[10px] uppercase shrink-0">Reason:</span>
              <span className="text-rose-200 font-semibold truncate">{gateReason || 'Underlying RWA or Mandate Ineligible'}</span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              The on-chain gate rejected execution before touching the vault. Transaction will not be broadcast.
            </p>
          </div>
        )}

        {/* Execute button */}
        {canExecute && !isPaused && isConnected && !isBlockedByNetwork ? (
          <button
            onClick={handleExecute}
            disabled={isExecuting}
            className="w-full py-2.5 px-4 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isExecuting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{txStatusLabel[txStatus]}</span>
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                <span>Execute via AgentExecutionGate</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        ) : (
          <button
            disabled
            className="w-full py-2.5 px-4 rounded-md bg-[#181B20] text-gray-500 font-medium text-xs cursor-not-allowed border border-[#2A303A]"
          >
            {!isConnected
              ? 'Connect Wallet to Execute'
              : isBlockedByNetwork
              ? 'Wrong Network — Switch to Arbitrum Sepolia'
              : isPaused
              ? 'Gate Paused by Admin'
              : 'Execution Blocked by Gate'}
          </button>
        )}
      </div>
    </div>
  );
}

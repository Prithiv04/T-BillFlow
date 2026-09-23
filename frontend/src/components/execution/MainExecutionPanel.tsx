'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Bot,
  Clock,
  Loader2,
  ExternalLink,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { useCanExecute } from '@/hooks/useCanExecute';
import { mockMandate, mockExecutionRequest, mockTxHistory } from '@/mocks/data';
import { useMode } from '@/context/ModeContext';
import { useLiveGate, TxStatus } from '@/hooks/useLiveGate';
import { useNetworkGuard } from '@/hooks/useNetworkGuard';
import { useAccount } from 'wagmi';
import { DEMO_MANDATE_ID } from '@/lib/constants';

interface MainExecutionPanelProps {
  onExecuted?: () => void;
}

// ─── Demo panel (unchanged from original) ────────────────────────────────────
function DemoExecutionPanel({ onExecuted }: MainExecutionPanelProps) {
  const { canExecute, reasons, checklist } = useCanExecute();
  const [isExecuting, setIsExecuting] = useState(false);

  const handleExecute = async () => {
    if (!canExecute || isExecuting) return;
    setIsExecuting(true);

    setTimeout(() => {
      const txHash = `0x${Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('')}`;

      mockTxHistory.unshift({
        hash: txHash,
        status: 'Success',
        time: Date.now(),
        amount: mockExecutionRequest.amount,
      });

      mockMandate.used += mockExecutionRequest.amount;
      setIsExecuting(false);
      onExecuted?.();
    }, 400);
  };

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
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
              DEMO / SIMULATION
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#181B20] text-gray-400 border border-[#2A303A]">
              canExecute()
            </span>
          </div>
        </div>

        {/* Proposed Request Card */}
        <div className="p-3.5 rounded-lg bg-[#0E1013] border border-[#1E2229] mb-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Proposed Action Payload <span className="text-amber-500/70">(Simulated)</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-gray-500 block text-[10px]">Action</span>
              <span className="font-mono font-medium text-white">{mockExecutionRequest.action}</span>
            </div>
            <div>
              <span className="text-gray-500 block text-[10px]">Amount</span>
              <span className="font-mono font-medium text-white">
                ${mockExecutionRequest.amount.toLocaleString()} tBUSD
              </span>
            </div>
            <div>
              <span className="text-gray-500 block text-[10px]">Target Asset</span>
              <span className="font-mono font-medium text-white">USTB (T-Bill)</span>
            </div>
          </div>
        </div>

        {/* Verification Checklist */}
        <div className="mb-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Boundary Verification Checklist
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            {checklist.map((item) => (
              <div
                key={item.key}
                className={`flex items-center justify-between p-2 rounded border ${
                  item.passed
                    ? 'bg-[#121418] border-[#1E2229] text-gray-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400 font-medium'
                }`}
              >
                <span className="text-[11px]">{item.label}</span>
                {item.passed ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 ml-1" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0 ml-1" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Decision Banner and Action Button */}
      <div className="pt-3 border-t border-[#1E2229] mt-auto">
        {canExecute ? (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>EXECUTION ALLOWED — All authorization & RWA eligibility passed.</span>
            </div>
            <button
              onClick={handleExecute}
              disabled={isExecuting}
              className="w-full py-2.5 px-4 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isExecuting ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  <span>Submitting via AgentExecutionGate...</span>
                </>
              ) : (
                <>
                  <span>Execute Autonomous Transaction</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold uppercase tracking-wider">
                  EXECUTION BLOCKED — {reasons.join(' • ')}
                </div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  The gate rejected the execution. Transaction will not be broadcast.
                </div>
              </div>
            </div>
            <button
              disabled
              className="w-full py-2.5 px-4 rounded-md bg-[#181B20] text-gray-500 font-medium text-xs cursor-not-allowed border border-[#2A303A]"
            >
              Execution Blocked by Gate
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Live panel ───────────────────────────────────────────────────────────────
function LiveExecutionPanel({ onExecuted }: MainExecutionPanelProps) {
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
  } = useLiveGate(DEMO_MANDATE_ID);

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
        <div className="p-3.5 rounded-lg bg-[#0E1013] border border-[#1E2229] mb-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
            On-Chain Execution Request
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-gray-500 block text-[10px]">Action</span>
              <span className="font-mono font-medium text-white">DEPOSIT</span>
            </div>
            <div>
              <span className="text-gray-500 block text-[10px]">Amount</span>
              <span className="font-mono font-medium text-white">$250,000 tBUSD</span>
            </div>
            <div>
              <span className="text-gray-500 block text-[10px]">Route</span>
              <span className="font-mono font-medium text-white">AgentExecutionGate</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-[#1E2229] text-[10px] font-mono text-gray-500">
            Target: TBillVault · Selector: deposit(uint256,address)
          </div>
        </div>

        {/* Wallet Status */}
        {!isConnected && (
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/25 text-blue-400 text-xs mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Connect your wallet to interact with live contracts.</span>
          </div>
        )}

        {isBlockedByNetwork && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Switch your wallet to <strong>Arbitrum Sepolia</strong> to execute.</span>
          </div>
        )}

        {/* Gate simulation result */}
        <div className="mb-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Gate Simulation — canExecuteAs()
          </div>
          <div className={`p-3 rounded-lg border text-xs font-mono flex items-center gap-2 ${
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
            <span>{isSimulating ? 'Querying on-chain gate...' : gateReason || 'Unavailable'}</span>
          </div>
        </div>
      </div>

      {/* Action area */}
      <div className="pt-3 border-t border-[#1E2229] mt-auto space-y-3">
        {/* Tx status bar */}
        {txStatus !== 'idle' && (
          <div className={`p-2.5 rounded-lg border text-xs font-mono flex items-center justify-between gap-2 ${
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

// ─── Main export — branches on mode ──────────────────────────────────────────
export function MainExecutionPanel({ onExecuted }: MainExecutionPanelProps) {
  const { isDemo } = useMode();
  return isDemo
    ? <DemoExecutionPanel onExecuted={onExecuted} />
    : <LiveExecutionPanel onExecuted={onExecuted} />;
}

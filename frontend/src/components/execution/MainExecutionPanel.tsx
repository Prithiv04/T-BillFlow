"use client";

import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, ArrowRight, Bot, Clock } from 'lucide-react';
import { useCanExecute } from '@/hooks/useCanExecute';
import { mockMandate, mockExecutionRequest, mockTxHistory } from '@/mocks/data';
import { useMode } from '@/context/ModeContext';

interface MainExecutionPanelProps {
  onExecuted?: () => void;
}

export function MainExecutionPanel({ onExecuted }: MainExecutionPanelProps) {
  const { canExecute, reasons, checklist } = useCanExecute();
  const { isDemo } = useMode();
  const [isExecuting, setIsExecuting] = useState(false);

  const handleExecute = async () => {
    if (!canExecute || isExecuting) return;
    setIsExecuting(true);

    // Simulate realistic execution timing
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

      if (onExecuted) {
        onExecuted();
      }
    }, 400);
  };

  return (
    <div className="panel p-5 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1E2229]">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-white tracking-tight">
              Agent Execution Gate
            </h2>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#181B20] text-gray-400 border border-[#2A303A]">
            canExecute()
          </span>
        </div>

        {/* Proposed Request Card */}
        <div className="p-3.5 rounded-lg bg-[#0E1013] border border-[#1E2229] mb-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Proposed Action Payload
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
            On-Chain Boundary Verification Checklist
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
                  The gate rejected the execution. Transaction will not be broadcast to the vault.
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

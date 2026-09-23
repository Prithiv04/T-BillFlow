"use client";

import React from 'react';
import { useCanExecute } from '@/hooks/useCanExecute';
import { mockMandate, mockExecutionRequest, mockTxHistory } from '@/mocks/data';
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

interface ExecutionGatePreviewProps {
  onExecuted?: () => void;
}

export function ExecutionGatePreview({ onExecuted }: ExecutionGatePreviewProps) {
  const { canExecute, reasons, checklist } = useCanExecute();

  const handleExecute = () => {
    if (!canExecute) return;
    const txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    mockTxHistory.unshift({
      hash: txHash,
      status: 'Success',
      time: Date.now(),
      amount: mockExecutionRequest.amount,
    });
    mockMandate.used += mockExecutionRequest.amount;
    if (onExecuted) {
      onExecuted();
    }
  };

  return (
    <div className="card-glass rounded-2xl p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#F0B90B]" />
            Agent Execution Gate
          </h2>
          <span className="text-xs px-2.5 py-1 rounded-full bg-[#F0B90B]/10 text-[#F0B90B] font-mono border border-[#F0B90B]/20">
            canExecute()
          </span>
        </div>

        <p className="text-xs text-gray-400 italic mb-4">
          &ldquo;The AI is autonomous. The authority is not.&rdquo;
        </p>

        {/* Proposed Request Details */}
        <div className="bg-black/30 rounded-xl p-3.5 mb-4 text-xs space-y-1.5 border border-white/5">
          <div className="text-gray-400 font-medium">Proposed Agent Action:</div>
          <div className="flex justify-between text-gray-300">
            <span>Action:</span>
            <span className="font-mono text-[#F0B90B]">{mockExecutionRequest.action}</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>Amount:</span>
            <span className="font-mono font-semibold text-white">
              ${mockExecutionRequest.amount.toLocaleString()} tBUSD
            </span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>Target:</span>
            <span className="font-mono text-gray-400">{mockExecutionRequest.target}</span>
          </div>
        </div>

        {/* 10-Item Verification Checklist */}
        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            On-Chain Eligibility Checklist
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {checklist.map((item) => (
              <div
                key={item.key}
                className={`flex items-center justify-between p-2 rounded-lg border ${
                  item.passed
                    ? 'bg-green-500/5 border-green-500/20 text-gray-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-400 font-medium'
                }`}
              >
                <span>{item.label}</span>
                {item.passed ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0 ml-1" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0 ml-1" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Decision Banner & Action Button */}
      <div className="pt-2 border-t border-white/10 mt-auto">
        {canExecute ? (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>EXECUTION ALLOWED — All mandate & RWA conditions satisfied.</span>
            </div>
            <button
              onClick={handleExecute}
              className="w-full py-2.5 px-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-600/20"
            >
              Execute Autonomous Transaction
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold uppercase tracking-wider">
                  EXECUTION BLOCKED — {reasons.join(' • ')}
                </div>
              </div>
            </div>
            <button
              disabled
              className="w-full py-2.5 px-4 rounded-xl bg-gray-800 text-gray-500 font-medium text-sm cursor-not-allowed border border-gray-700/50"
            >
              Execution Blocked by Gate
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

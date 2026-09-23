"use client";

import React from 'react';
import { mockMandate } from '@/mocks/data';
import { FileCheck, Shield, AlertCircle } from 'lucide-react';

export function MandateCard() {
  const usedPercent = Math.min(100, Math.round((mockMandate.used / mockMandate.maxCumulative) * 100));

  return (
    <div className="card-glass rounded-2xl p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-[#F0B90B]" />
            Agent Mandate Registry
          </h2>
          <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-gray-400 font-mono border border-white/10">
            AgentMandateRegistry.sol
          </span>
        </div>

        <div className="grid gap-3 text-sm">
          <div className="flex justify-between items-center py-1 border-b border-white/5">
            <span className="text-gray-400">Designated Agent</span>
            <span className="font-mono text-xs text-[#F0B90B] bg-[#F0B90B]/10 px-2 py-0.5 rounded">
              {mockMandate.agent}
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-white/5">
            <span className="text-gray-400">Allowed Action</span>
            <span className="font-mono text-xs font-semibold text-white bg-white/10 px-2 py-0.5 rounded">
              {mockMandate.allowedAction}
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-white/5">
            <span className="text-gray-400">Max Per-Tx Limit</span>
            <span className="font-mono font-medium text-white">
              ${mockMandate.maxTx.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-white/5">
            <span className="text-gray-400">Cumulative Budget</span>
            <span className="font-mono font-medium text-white">
              ${mockMandate.maxCumulative.toLocaleString()}
            </span>
          </div>

          <div className="py-1 border-b border-white/5 space-y-1.5">
            <div className="flex justify-between text-xs text-gray-400">
              <span>Budget Utilized</span>
              <span className="font-mono text-white">
                ${mockMandate.used.toLocaleString()} ({usedPercent}%)
              </span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  usedPercent >= 100 ? 'bg-red-500' : 'bg-[#F0B90B]'
                }`}
                style={{ width: `${usedPercent}%` }}
              />
            </div>
          </div>

          <div className="flex justify-between items-center py-1">
            <span className="text-gray-400">Mandate Status</span>
            {mockMandate.revoked ? (
              <span className="text-red-400 font-medium flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" /> Revoked
              </span>
            ) : (
              <span className="text-green-400 font-medium flex items-center gap-1">
                <Shield className="h-3.5 w-3.5" /> Active & Valid
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-500">
        <span>Signature: EIP-712 Verified</span>
        <span>Nonce: 0</span>
      </div>
    </div>
  );
}

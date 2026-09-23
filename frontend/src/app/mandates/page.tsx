"use client";

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Plus, KeyRound, Copy, Check } from 'lucide-react';
import { mockMandate } from '@/mocks/data';
import { ADDRESSES } from '@/config';

export default function MandatesPage() {
  const [selectedMandate, setSelectedMandate] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const mandates = [
    {
      id: '0x0000000000000000000000000000000000000000000000000000000000000001',
      agent: mockMandate.agent,
      asset: 'USTB',
      actions: 'DEPOSIT',
      maxTx: mockMandate.maxTx,
      maxCumulative: mockMandate.maxCumulative,
      used: mockMandate.used,
      validFrom: '2026-03-20',
      validUntil: '2026-10-23',
      status: !mockMandate.revoked ? 'ACTIVE' : 'REVOKED',
      nonce: 0,
      target: ADDRESSES.vault,
    },
    {
      id: '0x0000000000000000000000000000000000000000000000000000000000000002',
      agent: '0x17...C821',
      asset: 'USTB',
      actions: 'REDEEM',
      maxTx: 500000,
      maxCumulative: 2000000,
      used: 2000000,
      validFrom: '2025-01-01',
      validUntil: '2025-12-31',
      status: 'EXPIRED',
      nonce: 1,
      target: ADDRESSES.vault,
    },
  ];

  const m = mandates[selectedMandate];
  const percentUsed = (m.used / m.maxCumulative) * 100;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <AppShell
      title="Agent Mandate Registry"
      subtitle="EIP-712 Cryptographic Authority Delegation & Policy Management"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Delegated Authority Policies</h2>
          <p className="text-xs text-gray-500">
            Smart contract-enforced bounds defining agent permissions, actions, and budget caps.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Grant New Mandate</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Mandate List Table */}
        <div className="panel lg:col-span-2 p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs data-table">
              <thead>
                <tr>
                  <th>Agent Address</th>
                  <th>Asset</th>
                  <th>Actions</th>
                  <th>Per-Tx Limit</th>
                  <th>Cumulative Budget</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {mandates.map((item, idx) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedMandate(idx)}
                    className={`cursor-pointer ${
                      selectedMandate === idx ? 'bg-[#181B20]' : ''
                    }`}
                  >
                    <td className="font-mono text-gray-200">
                      <div className="flex items-center gap-1.5">
                        <KeyRound className="h-3.5 w-3.5 text-blue-400" />
                        <span>{item.agent}</span>
                      </div>
                    </td>
                    <td className="font-mono text-gray-300">{item.asset}</td>
                    <td className="font-mono text-emerald-400">{item.actions}</td>
                    <td className="font-mono text-white">${item.maxTx.toLocaleString()}</td>
                    <td className="font-mono text-white">
                      ${item.maxCumulative.toLocaleString()}
                    </td>
                    <td>
                      <span
                        className={`badge font-mono text-[10px] ${
                          item.status === 'ACTIVE'
                            ? 'badge-green'
                            : item.status === 'EXPIRED'
                            ? 'badge-neutral'
                            : 'badge-red'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mandate Detail Inspector */}
        <div className="panel p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1E2229]">
              <h3 className="text-sm font-semibold text-white tracking-tight">
                Mandate Policy Inspector
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#181B20] text-gray-400 border border-[#2A303A]">
                Nonce: {m.nonce}
              </span>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="p-2.5 rounded bg-[#0E1013] border border-[#1E2229]">
                <span className="text-gray-500 block text-[10px] uppercase">Designated Agent</span>
                <span className="text-white text-xs">{m.agent}</span>
              </div>

              <div className="p-2.5 rounded bg-[#0E1013] border border-[#1E2229]">
                <span className="text-gray-500 block text-[10px] uppercase">Target Contract</span>
                <span className="text-white text-xs">{m.target}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded bg-[#0E1013] border border-[#1E2229]">
                  <span className="text-gray-500 block text-[10px] uppercase">Per-Tx Cap</span>
                  <span className="text-white">${m.maxTx.toLocaleString()}</span>
                </div>
                <div className="p-2 rounded bg-[#0E1013] border border-[#1E2229]">
                  <span className="text-gray-500 block text-[10px] uppercase">Allowed Action</span>
                  <span className="text-emerald-400">{m.actions}</span>
                </div>
              </div>

              {/* Budget Progress Meter */}
              <div className="p-2.5 rounded bg-[#0E1013] border border-[#1E2229] space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-gray-400">Budget Usage:</span>
                  <span className="text-white">
                    ${m.used.toLocaleString()} / ${m.maxCumulative.toLocaleString()} (
                    {percentUsed.toFixed(0)}%)
                  </span>
                </div>
                <div className="w-full bg-[#181B20] h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      percentUsed >= 100
                        ? 'bg-rose-500'
                        : percentUsed > 75
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${percentUsed}%` }}
                  />
                </div>
              </div>

              <div className="p-2.5 rounded bg-[#0E1013] border border-[#1E2229]">
                <span className="text-gray-500 block text-[10px] uppercase">Validity Window</span>
                <span className="text-gray-300">
                  {m.validFrom} → {m.validUntil}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#1E2229] mt-3 flex items-center justify-between text-[11px] font-mono text-gray-500">
            <span>EIP-712 Domain Verified</span>
            <button
              onClick={() => handleCopy(m.id)}
              className="text-blue-400 hover:underline flex items-center gap-1"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              <span>Copy ID</span>
            </button>
          </div>
        </div>
      </div>

      {/* Create Mandate Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="panel max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E2229]">
              <h3 className="text-sm font-semibold text-white">Create Scoped Agent Mandate</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-white text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-400">
              Signs an EIP-712 typed data structure defining autonomous authority constraints.
            </p>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-gray-400 block mb-1">Agent Address</label>
                <input
                  type="text"
                  defaultValue="0xDeployer...Demo"
                  className="w-full p-2 rounded bg-[#0E1013] border border-[#1E2229] text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1">Max Per-Tx Limit ($)</label>
                  <input
                    type="number"
                    defaultValue={1000000}
                    className="w-full p-2 rounded bg-[#0E1013] border border-[#1E2229] text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Cumulative Cap ($)</label>
                  <input
                    type="number"
                    defaultValue={5000000}
                    className="w-full p-2 rounded bg-[#0E1013] border border-[#1E2229] text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-400 block mb-1">Allowed Target Contract</label>
                <input
                  type="text"
                  defaultValue={ADDRESSES.vault}
                  className="w-full p-2 rounded bg-[#0E1013] border border-[#1E2229] text-gray-300"
                  readOnly
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#1E2229]">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-1.5 rounded bg-[#181B20] text-gray-400 hover:text-white text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
              >
                Sign EIP-712 Mandate
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

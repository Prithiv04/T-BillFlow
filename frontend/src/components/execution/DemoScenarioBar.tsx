"use client";

import React from 'react';
import { RefreshCw, Play, ShieldAlert, AlertTriangle } from 'lucide-react';
import {
  loadSuccessScenario,
  loadBlockedScenarioMaxTx,
  loadBlockedScenarioCumulative,
  loadBlockedScenarioStaleNav,
  loadBlockedScenarioRedemptionClosed,
  resetDemo,
} from '@/mocks/data';

export type ScenarioType = 'valid' | 'maxTx' | 'cumulative' | 'staleNav' | 'redemptionClosed';

interface DemoScenarioBarProps {
  activeScenario: ScenarioType;
  onScenarioChange: (scenario: ScenarioType) => void;
  onReset: () => void;
}

export function DemoScenarioBar({
  activeScenario,
  onScenarioChange,
  onReset,
}: DemoScenarioBarProps) {
  const handleSelect = (scenario: ScenarioType) => {
    onScenarioChange(scenario);
    if (scenario === 'valid') loadSuccessScenario();
    else if (scenario === 'maxTx') loadBlockedScenarioMaxTx();
    else if (scenario === 'cumulative') loadBlockedScenarioCumulative();
    else if (scenario === 'staleNav') loadBlockedScenarioStaleNav();
    else if (scenario === 'redemptionClosed') loadBlockedScenarioRedemptionClosed();
  };

  const scenarios: { id: ScenarioType; label: string; badge: string; type: 'success' | 'blocked' | 'warning' }[] = [
    {
      id: 'valid',
      label: 'Case 1: Valid Execution',
      badge: 'Allowed',
      type: 'success',
    },
    {
      id: 'maxTx',
      label: 'Case 2: Exceeds Max Tx',
      badge: 'Blocked',
      type: 'blocked',
    },
    {
      id: 'cumulative',
      label: 'Case 3: Cumulative Budget',
      badge: 'Blocked',
      type: 'blocked',
    },
    {
      id: 'staleNav',
      label: 'Case 4: Stale NAV',
      badge: 'Auth ≠ Elig',
      type: 'warning',
    },
    {
      id: 'redemptionClosed',
      label: 'Case 5: Redemption Closed',
      badge: 'Blocked',
      type: 'blocked',
    },
  ];

  return (
    <div className="panel p-4 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400 font-mono">
            Demo Scenario Harness
          </div>
          <h3 className="text-xs font-semibold text-white mt-0.5">
            Deterministic Agent Execution Scenarios
          </h3>
        </div>

        <button
          onClick={onReset}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#181B20] hover:bg-[#20242B] border border-[#2A303A] text-xs font-mono text-gray-300 transition-colors self-start md:self-auto"
        >
          <RefreshCw className="h-3 w-3" />
          <span>Reset Demo State</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {scenarios.map((sc) => {
          const isActive = activeScenario === sc.id;
          return (
            <button
              key={sc.id}
              onClick={() => handleSelect(sc.id)}
              className={`p-2.5 rounded text-left transition-all border ${
                isActive
                  ? 'bg-[#181B20] border-blue-500/50 shadow-sm'
                  : 'bg-[#0E1013] border-[#1E2229] hover:bg-[#14161A]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-gray-500 uppercase">
                  {sc.id === 'valid' ? 'Case 1' : sc.id === 'maxTx' ? 'Case 2' : sc.id === 'cumulative' ? 'Case 3' : sc.id === 'staleNav' ? 'Case 4' : 'Case 5'}
                </span>
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                    sc.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : sc.type === 'warning'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {sc.badge}
                </span>
              </div>
              <div className="text-xs font-medium text-gray-200 truncate">
                {sc.label.split(':')[1]?.trim() || sc.label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

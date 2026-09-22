import React, { useState } from 'react';
import { useCanExecute } from '@/hooks/useCanExecute';
import { mockYield, mockRwaState, mockMandate } from '@/mocks/data';

export function ExecutionGatePreview() {
  const [checked, setChecked] = useState(false);
  const { canExecute, reasons } = useCanExecute();

  // Predefined checklist items based on mock requirements
  const checklist = [
    { label: 'Mandate valid', passed: !mockMandate.revoked },
    { label: 'Agent authorized', passed: true }, // always true in mock
    { label: 'Action allowed', passed: true }, // mock
    { label: 'Target allowed', passed: true }, // mock
    { label: 'Selector allowed', passed: true }, // mock
    { label: 'Tx limit', passed: true }, // mock
    { label: 'Cumulative limit', passed: true }, // mock
    { label: 'NAV freshness', passed: (Date.now() - mockRwaState.navUpdatedAt) / 1000 <= mockRwaState.maxNavAge },
    { label: 'Redemption status', passed: mockRwaState.redemptionOpen },
    { label: 'Liquidity tier', passed: mockRwaState.liquidityTier >= 1 },
  ];

  const handleCheck = () => setChecked(true);

  const handleExecute = () => {
    // In mock mode, just push a dummy transaction to history
    const txHash = `0x${Math.random().toString(16).slice(2, 10)}`;
    // Update mockTxHistory – since it's a simple export, we'll just push directly
    // This will work because mockTxHistory is mutable.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { mockTxHistory } = require('@/mocks/data');
    mockTxHistory.push({ hash: txHash, status: 'Success', time: Date.now() });
    alert(`Executed mock transaction: ${txHash}`);
  };

  return (
    <div className="card-glass rounded-2xl p-6">
      <h2 className="mb-4 text-lg font-semibold">Execution Preview</h2>
      <button
        className="mb-4 rounded bg-[#F0B90B]/20 px-4 py-2 text-sm hover:bg-[#F0B90B]/30"
        onClick={handleCheck}
      >
        Check Execution
      </button>
      {checked && (
        <>
          <ul className="mb-4 space-y-1 text-sm">
            {checklist.map((c) => (
              <li key={c.label} className="flex items-center gap-2">
                <span>{c.passed ? '✅' : '❌'}</span>
                <span>{c.label}</span>
              </li>
            ))}
          </ul>
          {canExecute ? (
            <button
              className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
              onClick={handleExecute}
            >
              Execute
            </button>
          ) : (
            <div className="text-red-500 text-sm">
              Blocked: {reasons.join(', ')}
            </div>
          )}
        </>
      )}
    </div>
  );
}

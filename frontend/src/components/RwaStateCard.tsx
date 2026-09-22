import React from 'react';
import { mockRwaState } from '@/mocks/data';

export function RwaStateCard() {
  const now = Date.now();
  const navFresh = (now - mockRwaState.navUpdatedAt) / 1000 <= mockRwaState.maxNavAge;
  const navFreshLabel = navFresh ? 'Fresh' : 'Stale';
  const navFreshColor = navFresh ? 'text-green-500' : 'text-red-500';
  const redemptionLabel = mockRwaState.redemptionOpen ? 'Open' : 'Closed';
  const redemptionColor = mockRwaState.redemptionOpen ? 'text-green-500' : 'text-red-500';

  return (
    <div className="card-glass rounded-2xl p-6">
      <h2 className="mb-4 text-lg font-semibold">RWA State</h2>
      <div className="grid gap-2">
        <div className="flex justify-between text-sm text-gray-400">
          <span>NAV</span>
          <span>${mockRwaState.nav.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-400">
          <span>Updated</span>
          <span>{new Date(mockRwaState.navUpdatedAt).toLocaleTimeString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Freshness</span>
          <span className={navFreshColor}>{navFreshLabel}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Redemption</span>
          <span className={redemptionColor}>{redemptionLabel}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-400">
          <span>Liquidity Tier</span>
          <span>{mockRwaState.liquidityTier}</span>
        </div>
      </div>
    </div>
  );
}

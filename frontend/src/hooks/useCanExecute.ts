import { mockYield, mockRwaState, mockMandate } from '@/mocks/data';
import { YIELD_THRESHOLD } from '@/config';

export function useCanExecute() {
  const now = Date.now();
  const navFresh = (now - mockRwaState.navUpdatedAt) / 1000 <= mockRwaState.maxNavAge;
  const reasons: string[] = [];

  if (mockYield < YIELD_THRESHOLD) reasons.push('Yield below threshold');
  if (!navFresh) reasons.push('NAV stale');
  if (!mockRwaState.redemptionOpen) reasons.push('Redemption closed');
  if (mockMandate.revoked) reasons.push('Mandate revoked');

  const canExecute = reasons.length === 0;
  return { canExecute, reasons };
}

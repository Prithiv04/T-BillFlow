import { mockYield, mockRwaState, mockMandate, mockExecutionRequest } from '@/mocks/data';
import { YIELD_THRESHOLD } from '@/config';

export interface ChecklistItem {
  key: string;
  label: string;
  passed: boolean;
  detail?: string;
}

export function useCanExecute() {
  const navFresh = !mockRwaState.isStale;
  const mandateValid = !mockMandate.revoked;

  const txLimitValid = mockExecutionRequest.amount <= mockMandate.maxTx;
  const cumulativeValid =
    mockMandate.used + mockExecutionRequest.amount <= mockMandate.maxCumulative;

  const agentAuthorized = Boolean(mockMandate.agent);
  const actionAllowed = mockExecutionRequest.action === mockMandate.allowedAction;
  const targetAllowed = Boolean(mockExecutionRequest.target);
  const selectorAllowed = Boolean(mockExecutionRequest.selector);
  const redemptionAllowed = mockRwaState.redemptionOpen;
  const liquidityTierAllowed = mockRwaState.liquidityTier >= 1;
  const yieldSufficient = mockYield >= YIELD_THRESHOLD;

  const reasons: string[] = [];

  if (!yieldSufficient) reasons.push('Yield below threshold');
  if (!mandateValid) reasons.push('Mandate revoked');
  if (!txLimitValid) reasons.push(`Transaction limit exceeded (${mockExecutionRequest.amount.toLocaleString()} > ${mockMandate.maxTx.toLocaleString()})`);
  if (!cumulativeValid) reasons.push(`Cumulative limit exceeded (${(mockMandate.used + mockExecutionRequest.amount).toLocaleString()} > ${mockMandate.maxCumulative.toLocaleString()})`);
  if (!navFresh) reasons.push('NAV stale');
  if (!redemptionAllowed) reasons.push('Redemption closed by oracle');
  if (!liquidityTierAllowed) reasons.push('Insufficient liquidity tier');

  const checklist: ChecklistItem[] = [
    { key: 'mandate', label: 'Mandate', passed: mandateValid },
    { key: 'agent', label: 'Agent', passed: agentAuthorized },
    { key: 'action', label: 'Action', passed: actionAllowed },
    { key: 'target', label: 'Target', passed: targetAllowed },
    { key: 'selector', label: 'Selector', passed: selectorAllowed },
    { key: 'txLimit', label: 'Tx limit', passed: txLimitValid },
    { key: 'cumulative', label: 'Cumulative', passed: cumulativeValid },
    { key: 'navFreshness', label: 'NAV freshness', passed: navFresh },
    { key: 'redemption', label: 'Redemption', passed: redemptionAllowed },
    { key: 'liquidity', label: 'Liquidity', passed: liquidityTierAllowed },
  ];

  const canExecute = reasons.length === 0;

  return { canExecute, reasons, checklist };
}

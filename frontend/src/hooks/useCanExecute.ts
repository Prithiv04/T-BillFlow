import { mockRwaState, mockMandate, mockExecutionRequest } from '@/mocks/data';

export interface ChecklistItem {
  key: string;
  label: string;
  passed: boolean;
  detail?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// useCanExecute — mirrors exactly what AgentExecutionGate.sol enforces:
//   AUTHORIZATION (mandate checks) and ELIGIBILITY (RWA oracle checks).
//
// NOTE: Yield threshold is an OFF-CHAIN agent decision (the agent decides
// whether to propose an action). It is NOT enforced by the on-chain gate and
// must NOT appear in the gate checklist. The AI is autonomous; the authority
// is not.
// ─────────────────────────────────────────────────────────────────────────────
export function useCanExecute() {
  // ── Authorization checks (AgentMandateRegistry.validateMandate) ──────────
  const mandateValid  = !mockMandate.revoked;
  const txLimitValid  = mockExecutionRequest.amount <= mockMandate.maxTx;
  const cumulativeValid =
    mockMandate.used + mockExecutionRequest.amount <= mockMandate.maxCumulative;
  const agentAuthorized  = Boolean(mockMandate.agent);
  const actionAllowed    = mockExecutionRequest.action === mockMandate.allowedAction;
  const targetAllowed    = Boolean(mockExecutionRequest.target);
  const selectorAllowed  = Boolean(mockExecutionRequest.selector);

  // ── Eligibility checks (RWAStateOracle.isEligible) ───────────────────────
  const navFresh            = !mockRwaState.isStale;
  const redemptionAllowed   = mockRwaState.redemptionOpen;
  const liquidityTierAllowed = mockRwaState.liquidityTier >= 1;

  const reasons: string[] = [];

  // Authorization failures
  if (!mandateValid)    reasons.push('Mandate revoked');
  if (!txLimitValid)    reasons.push(`TxLimitExceeded (${mockExecutionRequest.amount.toLocaleString()} > ${mockMandate.maxTx.toLocaleString()})`);
  if (!cumulativeValid) reasons.push(`CumulativeLimitExceeded (${(mockMandate.used + mockExecutionRequest.amount).toLocaleString()} > ${mockMandate.maxCumulative.toLocaleString()})`);

  // Eligibility failures
  if (!navFresh)             reasons.push('NavStale — Authorization ≠ Eligibility');
  if (!redemptionAllowed)    reasons.push('RedemptionClosed');
  if (!liquidityTierAllowed) reasons.push('LiquidityTooLow');

  const checklist: ChecklistItem[] = [
    { key: 'mandate',      label: 'Mandate registered & active', passed: mandateValid },
    { key: 'agent',        label: 'Designated agent identity',   passed: agentAuthorized },
    { key: 'action',       label: 'Action permission',           passed: actionAllowed },
    { key: 'target',       label: 'Target whitelist',            passed: targetAllowed },
    { key: 'selector',     label: 'Selector allowlist',          passed: selectorAllowed },
    { key: 'txLimit',      label: 'Per-tx limit',                passed: txLimitValid },
    { key: 'cumulative',   label: 'Cumulative budget',           passed: cumulativeValid },
    { key: 'navFreshness', label: 'NAV freshness',               passed: navFresh },
    { key: 'redemption',   label: 'Redemption window',           passed: redemptionAllowed },
    { key: 'liquidity',    label: 'Liquidity tier ≥ 1',          passed: liquidityTierAllowed },
  ];

  const canExecute = reasons.length === 0;

  return { canExecute, reasons, checklist };
}


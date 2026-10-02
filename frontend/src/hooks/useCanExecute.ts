import { useLiveGate } from '@/hooks/useLiveGate';
import { DEFAULT_MANDATE_ID } from '@/lib/constants';

export interface ChecklistItem {
  key: string;
  label: string;
  passed: boolean;
  detail?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// useCanExecute — derives the gate checklist from the live on-chain
//   canExecuteAs() call (via useLiveGate). Mirrors exactly what
//   AgentExecutionGate.sol enforces:
//     AUTHORIZATION (mandate checks) and ELIGIBILITY (RWA oracle checks).
//
// NOTE: Yield threshold is an OFF-CHAIN agent decision (the agent decides
// whether to propose an action). It is NOT enforced by the on-chain gate and
// must NOT appear in the gate checklist.
// ─────────────────────────────────────────────────────────────────────────────
export function useCanExecute() {
  const { canExecute, gateReason } = useLiveGate(DEFAULT_MANDATE_ID);

  // Derive individual check pass/fail from the gate reason string returned
  // by canExecuteAs(). When canExecute is true every check passes.
  const mandateValid      = canExecute || !gateReason.includes('Mandate');
  const agentAuthorized   = canExecute || !gateReason.includes('CallerNotAgent');
  const actionAllowed     = canExecute || !gateReason.includes('ActionNotAllowed');
  const targetAllowed     = canExecute || !gateReason.includes('TargetNotAllowed');
  const selectorAllowed   = canExecute || !gateReason.includes('SelectorNotAllowed');
  const txLimitValid      = canExecute || !gateReason.includes('TxLimitExceeded');
  const cumulativeValid   = canExecute || !gateReason.includes('CumulativeLimitExceeded');
  const navFresh          = canExecute || !gateReason.includes('NavStale');
  const redemptionAllowed = canExecute || !gateReason.includes('RedemptionClosed');
  const liquidityTierAllowed = canExecute || !gateReason.includes('LiquidityTooLow');

  const reasons: string[] = gateReason && !canExecute ? [gateReason] : [];

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

  return { canExecute, reasons, checklist };
}

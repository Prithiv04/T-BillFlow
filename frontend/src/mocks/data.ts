export const mockYield = 6.5; // synthetic annual yield percentage

export const INITIAL_MOCK_TIME = 1774000000000; // Fixed deterministic reference timestamp (2026-03-20T09:46:40.000Z)

export const mockRwaState = {
  nav: 1000,
  navUpdatedAt: INITIAL_MOCK_TIME,
  isStale: false,
  redemptionOpen: true,
  liquidityTier: 2,
  supported: true,
  maxNavAge: 300, // seconds
};

export const mockMandate = {
  agent: "0xDeployer",
  allowedAction: "DEPOSIT",
  maxTx: 1_000_000,
  maxCumulative: 5_000_000,
  used: 0,
  validFrom: INITIAL_MOCK_TIME - 1_000,
  validUntil: INITIAL_MOCK_TIME + 86_400_000,
  revoked: false,
};

export const mockExecutionRequest = {
  target: "TBillVault (0xVault)",
  selector: "deposit(uint256,address)",
  action: "DEPOSIT",
  amount: 250_000,
};

export const mockTxHistory: Array<{ hash: string; status: string; time: number; amount: number }> = [];

/** Demo scenario helpers **/
export function loadSuccessScenario() {
  // Healthy RWA
  mockRwaState.isStale = false;
  mockRwaState.navUpdatedAt = INITIAL_MOCK_TIME;
  mockRwaState.redemptionOpen = true;
  mockRwaState.liquidityTier = 2;
  mockRwaState.supported = true;
  // Valid mandate
  mockMandate.revoked = false;
  mockMandate.validFrom = INITIAL_MOCK_TIME - 1_000;
  mockMandate.validUntil = INITIAL_MOCK_TIME + 86_400_000;
  mockMandate.maxTx = 1_000_000;
  mockMandate.maxCumulative = 5_000_000;
  mockMandate.used = 0;
  // Valid execution request
  mockExecutionRequest.amount = 250_000;
  mockExecutionRequest.action = "DEPOSIT";
}

export function loadBlockedScenarioMaxTx() {
  loadSuccessScenario();
  // Amount exceeds single transaction limit (maxTx = 1,000,000)
  mockExecutionRequest.amount = 2_000_000;
}

export function loadBlockedScenarioCumulative() {
  loadSuccessScenario();
  // Cumulative budget exceeded (used 4.8M + 500k > 5M limit)
  mockMandate.used = 4_800_000;
  mockExecutionRequest.amount = 500_000;
}

export function loadBlockedScenarioStaleNav() {
  loadSuccessScenario();
  // NAV stale
  mockRwaState.isStale = true;
  mockRwaState.navUpdatedAt = INITIAL_MOCK_TIME - 360_000; // 6 mins earlier
}

export function loadBlockedScenarioRedemptionClosed() {
  loadSuccessScenario();
  mockRwaState.redemptionOpen = false;
}

export function resetDemo() {
  loadSuccessScenario();
  mockTxHistory.length = 0;
}

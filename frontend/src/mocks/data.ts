export const mockYield = 6.5; // synthetic annual yield percentage

export const mockRwaState = {
  nav: 1000,
  navUpdatedAt: Date.now(), // timestamp in ms
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
  validFrom: Date.now() - 1_000,
  validUntil: Date.now() + 86_400_000,
  revoked: false,
};

export const mockTxHistory: Array<{ hash: string; status: string; time: number }> = [];

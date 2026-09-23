// Arbitrum Sepolia Configuration & Contract Addresses
// ─────────────────────────────────────────────────────────────────────────────
// Deployed via: contracts/broadcast/Deploy.s.sol/421614/run-latest.json
// ─────────────────────────────────────────────────────────────────────────────

export const CHAIN_ID = 421614;
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc';
export const EXPLORER_URL = 'https://sepolia.arbiscan.io';

// ── Deployed contract addresses ───────────────────────────────────────────────
export const TBILL_VAULT_ADDRESS    = '0x2f9453ece66d76431e3acbe33770c60d79adcda5' as const;
export const TBUSD_ADDRESS          = '0xcde2fb76d39d060314231b15fd4d2719d6c2b354' as const;
export const RWA_ORACLE_ADDRESS     = '0x3ec0fec36de1f05087dbda93c2335182383defed' as const;
export const MANDATE_REGISTRY_ADDRESS = '0x221c9a9f1a6eed91642955baee3208c2fc901d1d' as const;
export const EXECUTION_GATE_ADDRESS = '0xd39a16c7f36b6e103903342c0abd98fcf1f7c88d' as const;

// Legacy / UI compatibility aliases
export const TBILL_SHARE_ADDRESS  = TBILL_VAULT_ADDRESS;
export const TBILLFLOW_CONTRACT   = TBILL_VAULT_ADDRESS;
export const TBILLFLOW_TOKEN      = TBILL_SHARE_ADDRESS;
export const TBUSD_TOKEN          = TBUSD_ADDRESS;
export const BSCSCAN_BASE         = EXPLORER_URL;

// ── Known demo mandate ID ────────────────────────────────────────────────────
// The deploy script grants a single mandate to the deployer address.
// This is the deterministic mandateId derived from the deploy parameters.
// Used by the live gate hook to construct ExecutionRequests.
// If no mandate exists on-chain, live mode gracefully shows "Unavailable".
export const DEMO_MANDATE_ID =
  '0x0000000000000000000000000000000000000000000000000000000000000000' as const;

// ── Action bitmask constants (mirrors Types.sol Actions library) ──────────────
export const ACTION_DEPOSIT  = 1n;  // 1 << 0
export const ACTION_REDEEM   = 2n;  // 1 << 1
export const ACTION_ALLOCATE = 4n;  // 1 << 2
export const ACTION_WITHDRAW = 8n;  // 1 << 3

// ── Deposit function selector: deposit(uint256,address) ──────────────────────
export const DEPOSIT_SELECTOR = '0xb6b55f25' as const;

// ── Protocol constants ────────────────────────────────────────────────────────
export const APY         = 5.0;    // 5.0% APY
export const SHARE_RATE  = 1.0002; // 1 share ≈ 1.0002 tBUSD

// Arbitrum Sepolia Configuration & Contract Addresses
export const CHAIN_ID = 421614;
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc";
export const EXPLORER_URL = "https://sepolia.arbiscan.io";

export const TBILL_VAULT_ADDRESS = "0x736985ed65a72b1b44b572ff75eb52dd7d624ef9" as const;
export const TBUSD_ADDRESS = "0x8301F2213c0eeD49a7E28Ae4c3e91722919B8B47" as const;
export const TBILL_SHARE_ADDRESS = TBILL_VAULT_ADDRESS;

// Legacy & UI Compatibility Aliases
export const TBILLFLOW_CONTRACT = TBILL_VAULT_ADDRESS;
export const TBILLFLOW_TOKEN = TBILL_SHARE_ADDRESS;
export const TBUSD_TOKEN = TBUSD_ADDRESS;
export const BSCSCAN_BASE = EXPLORER_URL;

export const APY = 5.0; // 5.0% APY
export const SHARE_RATE = 1.0002; // 1 share = 1.0002 tBUSD based on USTB NAV

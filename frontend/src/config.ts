import {
  EXECUTION_GATE_ADDRESS,
  TBILL_VAULT_ADDRESS,
  RWA_ORACLE_ADDRESS,
  MANDATE_REGISTRY_ADDRESS,
} from '@/lib/constants';

export const CHAIN_ID = 421614; // Arbitrum Sepolia

export const ADDRESSES = {
  gate:     EXECUTION_GATE_ADDRESS,
  vault:    TBILL_VAULT_ADDRESS,
  oracle:   RWA_ORACLE_ADDRESS,
  registry: MANDATE_REGISTRY_ADDRESS,
} as const;

export const YIELD_THRESHOLD = Number(process.env.NEXT_PUBLIC_YIELD_THRESHOLD ?? 5.0);

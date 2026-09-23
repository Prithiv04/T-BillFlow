'use client';

import { useChainId } from 'wagmi';
import { CHAIN_ID } from '@/lib/constants';

export function useNetworkGuard() {
  const chainId = useChainId();
  const isCorrectNetwork = chainId === CHAIN_ID;

  return {
    chainId,
    isCorrectNetwork,
    requiredChainId: CHAIN_ID,
    networkName: isCorrectNetwork ? 'Arbitrum Sepolia' : `Chain ${chainId}`,
  };
}

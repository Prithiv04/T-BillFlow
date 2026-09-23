'use client';

import { useReadContract } from 'wagmi';
import { rwaStateOracleAbi } from '@/abis/rwaStateOracleAbi';
import { RWA_ORACLE_ADDRESS, TBUSD_ADDRESS } from '@/lib/constants';

export interface LiveRwaState {
  nav: bigint;
  navUpdatedAt: bigint;
  redemptionOpen: boolean;
  liquidityTier: number;
  supported: boolean;
  maxNavAge: bigint;
  isStale: boolean;
  navAgeSeconds: number;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

const UNAVAILABLE: LiveRwaState = {
  nav: 0n,
  navUpdatedAt: 0n,
  redemptionOpen: false,
  liquidityTier: 0,
  supported: false,
  maxNavAge: 0n,
  isStale: true,
  navAgeSeconds: 0,
  isLoading: false,
  isError: true,
  refetch: () => {},
};

export function useLiveRwaState(): LiveRwaState {
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useReadContract({
    address: RWA_ORACLE_ADDRESS,
    abi: rwaStateOracleAbi,
    functionName: 'getAssetState',
    args: [TBUSD_ADDRESS],
    query: {
      refetchInterval: 15_000,
    },
  });

  if (isLoading) {
    return { ...UNAVAILABLE, isLoading: true, isError: false };
  }

  if (isError || !data) {
    return UNAVAILABLE;
  }

  const nowSec = BigInt(Math.floor(Date.now() / 1000));
  const navAge = data.navUpdatedAt > 0n ? nowSec - data.navUpdatedAt : nowSec;
  const isStale = !data.supported || data.navUpdatedAt === 0n || navAge > data.maxNavAge;

  return {
    nav: data.nav,
    navUpdatedAt: data.navUpdatedAt,
    redemptionOpen: data.redemptionOpen,
    liquidityTier: data.liquidityTier,
    supported: data.supported,
    maxNavAge: data.maxNavAge,
    isStale,
    navAgeSeconds: Number(navAge),
    isLoading: false,
    isError: false,
    refetch,
  };
}

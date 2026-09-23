'use client';

import { useReadContracts } from 'wagmi';
import { agentMandateRegistryAbi } from '@/abis/agentMandateRegistryAbi';
import { MANDATE_REGISTRY_ADDRESS } from '@/lib/constants';

export interface LiveMandateData {
  agent: string;
  asset: string;
  allowedTarget: string;
  allowedActionsMask: bigint;
  maxTx: bigint;
  maxCumulative: bigint;
  used: bigint;
  validFrom: bigint;
  validUntil: bigint;
  nonce: bigint;
  revoked: boolean;
  owner: string;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

const UNAVAILABLE_MANDATE: LiveMandateData = {
  agent: '',
  asset: '',
  allowedTarget: '',
  allowedActionsMask: 0n,
  maxTx: 0n,
  maxCumulative: 0n,
  used: 0n,
  validFrom: 0n,
  validUntil: 0n,
  nonce: 0n,
  revoked: false,
  owner: '',
  isLoading: false,
  isError: true,
  refetch: () => {},
};

export function useLiveMandate(mandateId: `0x${string}`): LiveMandateData {
  const isZeroId = mandateId === '0x0000000000000000000000000000000000000000000000000000000000000000';

  const { data, isLoading, isError, refetch } = useReadContracts({
    contracts: [
      {
        address: MANDATE_REGISTRY_ADDRESS,
        abi: agentMandateRegistryAbi,
        functionName: 'getMandate',
        args: [mandateId],
      },
      {
        address: MANDATE_REGISTRY_ADDRESS,
        abi: agentMandateRegistryAbi,
        functionName: 'mandateOwner',
        args: [mandateId],
      },
    ],
    query: {
      enabled: !isZeroId,
      refetchInterval: 15_000,
    },
  });

  // Zero mandate ID means "not configured" — return unavailable cleanly
  if (isZeroId) {
    return { ...UNAVAILABLE_MANDATE, isError: false };
  }

  if (isLoading) {
    return { ...UNAVAILABLE_MANDATE, isLoading: true, isError: false };
  }

  if (isError || !data) {
    return UNAVAILABLE_MANDATE;
  }

  const mandateResult = data[0];
  const ownerResult   = data[1];

  if (mandateResult.status !== 'success' || !mandateResult.result) {
    return UNAVAILABLE_MANDATE;
  }

  const m = mandateResult.result;

  return {
    agent:               m.agent,
    asset:               m.asset,
    allowedTarget:       m.allowedTarget,
    allowedActionsMask:  m.allowedActionsMask,
    maxTx:               m.maxTx,
    maxCumulative:       m.maxCumulative,
    used:                m.used,
    validFrom:           m.validFrom,
    validUntil:          m.validUntil,
    nonce:               m.nonce,
    revoked:             m.revoked,
    owner:               ownerResult.status === 'success' ? (ownerResult.result as string) : '',
    isLoading:           false,
    isError:             false,
    refetch,
  };
}

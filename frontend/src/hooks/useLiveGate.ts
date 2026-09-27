'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { encodeFunctionData } from 'viem';
import { agentExecutionGateAbi } from '@/abis/agentExecutionGateAbi';
import { agentMandateRegistryAbi } from '@/abis/agentMandateRegistryAbi';
import { tbillVaultAbi } from '@/abis/tbillVaultAbi';
import {
  EXECUTION_GATE_ADDRESS,
  MANDATE_REGISTRY_ADDRESS,
  TBILL_VAULT_ADDRESS,
  TBUSD_ADDRESS,
  DEMO_MANDATE_ID,
  ACTION_DEPOSIT,
  DEPOSIT_SELECTOR,
  EXPLORER_URL,
} from '@/lib/constants';

// ─── Transaction status lifecycle ────────────────────────────────────────────
export type TxStatus =
  | 'idle'
  | 'preparing'
  | 'signing'
  | 'pending'
  | 'confirmed'
  | 'failed';

export interface LiveGateState {
  canExecute: boolean;
  gateReason: string;
  isSimulating: boolean;
  txStatus: TxStatus;
  txHash: `0x${string}` | undefined;
  txError: string | undefined;
  explorerUrl: string | undefined;
  executeDeposit: (amountWei: bigint) => Promise<void>;
  reset: () => void;
  isPaused: boolean;
}

// ─── Build the ExecutionRequest tuple ────────────────────────────────────────
function buildDepositRequest(
  mandateId: `0x${string}`,
  amountWei: bigint,
  receiver: `0x${string}`,
) {
  const callData = encodeFunctionData({
    abi: tbillVaultAbi,
    functionName: 'deposit',
    args: [amountWei, receiver],
  });

  return {
    mandateId,
    asset:    TBUSD_ADDRESS,
    action:   ACTION_DEPOSIT,
    amount:   amountWei,
    target:   TBILL_VAULT_ADDRESS,
    selector: DEPOSIT_SELECTOR as `0x${string}`,
    callData,
  } as const;
}

// ─── Error selector decoder ───────────────────────────────────────────────────
const ERROR_MAP: Record<string, string> = {
  '0x726461f5': 'GatePaused',
  '0xbdb518d2': 'SelectorNotAllowed',
  '0xc66896c9': 'MandateNotFound',
  '0xb38f9f9a': 'MandateNotYetValid',
  '0x27267dfd': 'MandateExpired',
  '0x2baefe03': 'MandateRevoked',
  '0xd7800e18': 'CallerNotAgent',
  '0x829e3733': 'ActionNotAllowed',
  '0x48cbf26d': 'TargetNotAllowed',
  '0x6c1cb1f6': 'TxLimitExceeded',
  '0xcbb940a1': 'CumulativeLimitExceeded',
  '0x8baa579f': 'InvalidSignature',
  '0xd34ef10e': 'InvalidMandateParams',
  '0x0b95173d': 'NotMandateOwner',
  '0x981a2a2b': 'AssetNotSupported',
  '0x979a5876': 'NavStale — NAV is stale (Authorization ≠ Eligibility)',
  '0x9f09496b': 'RedemptionClosed',
  '0x4088b741': 'LiquidityTooLow',
};

function decodeGateError(reason: `0x${string}` | Uint8Array): string {
  let hex: string;
  if (typeof reason === 'string') {
    hex = reason.toLowerCase();
  } else {
    hex = '0x' + Array.from(reason).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  const selector = hex.slice(0, 10);
  return ERROR_MAP[selector] ?? `Gate blocked (${selector})`;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useLiveGate(
  mandateId: `0x${string}` = DEMO_MANDATE_ID,
  amountWei: bigint = 250_000_000_000n, // 250,000 MockUSDC (6 decimals)
): LiveGateState {
  const { address } = useAccount();
  const [txStatus, setTxStatus]   = useState<TxStatus>('idle');
  const [txHash,   setTxHash]     = useState<`0x${string}` | undefined>();
  const [txError,  setTxError]    = useState<string | undefined>();

  const isZeroMandate = mandateId === '0x0000000000000000000000000000000000000000000000000000000000000000';

  // ── Read mandate to know the designated agent ────────────────────────────
  const { data: mandateData } = useReadContract({
    address: MANDATE_REGISTRY_ADDRESS,
    abi: agentMandateRegistryAbi,
    functionName: 'getMandate',
    args: [mandateId],
    query: {
      enabled: !isZeroMandate,
      refetchInterval: 30_000,
    },
  });

  const simAgent = (mandateData?.agent || address) as `0x${string}` | undefined;
  const receiver = (address || mandateData?.agent || '0x0000000000000000000000000000000000000000') as `0x${string}`;

  // ── 1. canExecuteAs() simulation ────────────────────────────────────────
  const req = simAgent && !isZeroMandate
    ? buildDepositRequest(mandateId, amountWei, receiver)
    : undefined;

  const { data: canExecData, isLoading: isSimulating } = useReadContract({
    address: EXECUTION_GATE_ADDRESS,
    abi: agentExecutionGateAbi,
    functionName: 'canExecuteAs',
    args: req && simAgent ? [req, simAgent] : undefined,
    query: {
      enabled: !!req && !!simAgent,
      refetchInterval: 15_000,
    },
  });

  // ── 2. Gate paused ───────────────────────────────────────────────────────
  const { data: isPausedData } = useReadContract({
    address: EXECUTION_GATE_ADDRESS,
    abi: agentExecutionGateAbi,
    functionName: 'paused',
    query: { refetchInterval: 30_000 },
  });

  // ── 3. Write: execute() ──────────────────────────────────────────────────
  const { writeContractAsync } = useWriteContract();

  // ── 4. Wait for receipt ──────────────────────────────────────────────────
  const { isSuccess: isReceiptSuccess, isError: isReceiptError } =
    useWaitForTransactionReceipt({
      hash: txHash,
      query: { enabled: !!txHash && txStatus === 'pending' },
    });

  // Advance status from 'pending' once receipt arrives
  useEffect(() => {
    if (txStatus === 'pending' && isReceiptSuccess) {
      setTxStatus('confirmed');
    }
    if (txStatus === 'pending' && isReceiptError) {
      setTxStatus('failed');
      setTxError('Transaction reverted on-chain');
    }
  }, [txStatus, isReceiptSuccess, isReceiptError]);

  // ── 5. executeDeposit ────────────────────────────────────────────────────
  const executeDeposit = useCallback(async (depositAmount: bigint) => {
    if (!address) return;

    setTxStatus('preparing');
    setTxError(undefined);
    setTxHash(undefined);

    try {
      const builtReq = buildDepositRequest(mandateId, depositAmount, address);
      setTxStatus('signing');

      const hash = await writeContractAsync({
        address: EXECUTION_GATE_ADDRESS,
        abi: agentExecutionGateAbi,
        functionName: 'execute',
        args: [builtReq],
      });

      setTxHash(hash);
      setTxStatus('pending');
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message.slice(0, 150) : 'Transaction failed';
      setTxError(msg);
      setTxStatus('failed');
    }
  }, [address, mandateId, writeContractAsync]);

  const reset = useCallback(() => {
    setTxStatus('idle');
    setTxHash(undefined);
    setTxError(undefined);
  }, []);

  // ── Derive canExecute / reason ───────────────────────────────────────────
  let canExecute = false;
  let gateReason = 'Gate state unavailable';

  if (isZeroMandate) {
    gateReason = 'No on-chain mandate configured — use Demo mode';
  } else if (isSimulating) {
    gateReason = 'Querying on-chain gate...';
  } else if (canExecData !== undefined) {
    canExecute = canExecData[0];
    if (!canExecute && canExecData[1] && (canExecData[1] as `0x${string}`).length > 2) {
      gateReason = decodeGateError(canExecData[1] as `0x${string}`);
    } else if (canExecute) {
      gateReason = 'All authorization & RWA eligibility checks passed';
    } else {
      gateReason = 'Gate blocked execution';
    }
  } else if (!simAgent) {
    gateReason = 'Connect wallet to simulate gate';
  } else {
    gateReason = 'Gate state unavailable';
  }

  return {
    canExecute,
    gateReason,
    isSimulating,
    txStatus,
    txHash,
    txError,
    explorerUrl: txHash ? `${EXPLORER_URL}/tx/${txHash}` : undefined,
    executeDeposit,
    reset,
    isPaused: isPausedData ?? false,
  };
}

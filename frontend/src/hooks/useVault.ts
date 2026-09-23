import { useReadContract, useWriteContract, useAccount } from 'wagmi';
import { TBILL_VAULT_ADDRESS, TBUSD_ADDRESS } from '@/lib/constants';
import { tbillVaultAbi } from '@/abis/tbillVaultAbi';
import { erc20Abi } from '@/abis/erc20Abi';

export function useVault() {
  const { address } = useAccount();

  // 1. Read Total Value Locked (TVL) — polls every 10s for real-time updates
  const { data: tvl, isLoading: isTvlLoading, refetch: refetchTvl } = useReadContract({
    address: TBILL_VAULT_ADDRESS,
    abi: tbillVaultAbi,
    functionName: 'totalAssets',
    query: {
      refetchInterval: 10_000,
    },
  });

  // 2. Read User's Share Balance — polls every 10s
  const { data: shareBalance, isLoading: isBalanceLoading, refetch: refetchBalance } = useReadContract({
    address: TBILL_VAULT_ADDRESS,
    abi: tbillVaultAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 10_000,
    },
  });

  // 3. Read User's tBUSD Balance
  const { data: tbusdBalance, refetch: refetchTbusdBalance } = useReadContract({
    address: TBUSD_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 10_000,
    },
  });

  // 4. Write Operations (Deposit & Approve)
  const { writeContractAsync: depositAsync, isPending: isDepositPending } = useWriteContract();
  const { writeContractAsync: approveAsync, isPending: isApprovePending } = useWriteContract();
  const { writeContractAsync: redeemAsync, isPending: isRedeemPending } = useWriteContract();

  const deposit = async (amount: bigint) => {
    // Note: A real implementation would check allowance first
    // Here we directly expose the deposit call for the component to use
    return await depositAsync({
      address: TBILL_VAULT_ADDRESS,
      abi: tbillVaultAbi,
      functionName: 'deposit',
      args: [amount, address as `0x${string}`],
      gas: 300000n,
      gasPrice: 1000000000n, // 1 Gwei
    });
  };

  const approve = async (amount: bigint) => {
    return await approveAsync({
      address: TBUSD_ADDRESS,
      abi: erc20Abi,
      functionName: 'approve',
      args: [TBILL_VAULT_ADDRESS, amount],
      gas: 100000n, // Less gas needed for approve
      gasPrice: 1000000000n, // 1 Gwei
    });
  };

  const redeem = async (shares: bigint) => {
    return await redeemAsync({
      address: TBILL_VAULT_ADDRESS,
      abi: tbillVaultAbi,
      functionName: 'redeem',
      args: [shares, address as `0x${string}`, address as `0x${string}`],
      gas: 300000n,
      gasPrice: 1000000000n, // 1 Gwei
    });
  };

  return {
    tvl,
    isTvlLoading,
    shareBalance,
    isBalanceLoading,
    tbusdBalance,
    isDepositPending,
    isApprovePending,
    isRedeemPending,
    deposit,
    approve,
    redeem,
    refetchAll: () => {
      refetchTvl();
      refetchBalance();
      refetchTbusdBalance();
    }
  };
}

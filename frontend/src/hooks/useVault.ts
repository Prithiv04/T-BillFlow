import { useReadContract, useWriteContract, useAccount } from 'wagmi';
import { TBILL_VAULT_ADDRESS, TBUSD_ADDRESS } from '@/lib/constants';
import { tbillVaultAbi } from '@/abis/tbillVaultAbi';
const TOTAL_SUPPLY_FN = 'totalSupply' as const;
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
  const {
    data: shareBalance,
    isLoading: isBalanceLoading,
    isError: isBalanceError,
    refetch: refetchBalance,
  } = useReadContract({
    address: TBILL_VAULT_ADDRESS,
    abi: tbillVaultAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 10_000,
    },
  });

  // 3. Read User's Portfolio Value via ERC-4626 convertToAssets — polls every 10s
  const {
    data: portfolioAssets,
    isLoading: isPortfolioLoading,
    isError: isPortfolioError,
    refetch: refetchPortfolio,
  } = useReadContract({
    address: TBILL_VAULT_ADDRESS,
    abi: tbillVaultAbi,
    functionName: 'convertToAssets',
    args: shareBalance !== undefined ? [shareBalance] : undefined,
    query: {
      enabled: !!address && shareBalance !== undefined,
      refetchInterval: 10_000,
    },
  });

  // 4. Read User's tBUSD Balance
  const {
    data: tbusdBalance,
    isLoading: isTbusdLoading,
    isError: isTbusdError,
    refetch: refetchTbusdBalance,
  } = useReadContract({
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
    // Allowance check performed before deposit
    return await depositAsync({
      address: TBILL_VAULT_ADDRESS,
      abi: tbillVaultAbi,
      functionName: 'deposit',
      args: [amount, address as `0x${string}`],
    });
  };

  const approve = async (amount: bigint) => {
    return await approveAsync({
      address: TBUSD_ADDRESS,
      abi: erc20Abi,
      functionName: 'approve',
      args: [TBILL_VAULT_ADDRESS, amount],
    });
  };

  const redeem = async (shares: bigint) => {
    return await redeemAsync({
      address: TBILL_VAULT_ADDRESS,
      abi: tbillVaultAbi,
      functionName: 'redeem',
      args: [shares, address as `0x${string}`, address as `0x${string}`],
    });
  };

  return {
    address,
    isConnected: !!address,
    tvl,
    isTvlLoading,
    shareBalance,
    isBalanceLoading,
    isBalanceError,
    portfolioAssets,
    isPortfolioLoading,
    isPortfolioError,
    tbusdBalance,
    isTbusdLoading,
    isTbusdError,
    isDepositPending,
    isApprovePending,
    isRedeemPending,
    deposit,
    approve,
    redeem,
    refetchAll: () => {
      refetchTvl();
      refetchBalance();
      refetchPortfolio();
      refetchTbusdBalance();
    }
  };
}

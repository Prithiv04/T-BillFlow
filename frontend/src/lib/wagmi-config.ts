import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { injectedWallet, metaMaskWallet } from "@rainbow-me/rainbowkit/wallets";
import { arbitrumSepolia } from "wagmi/chains";
import { http } from "wagmi";

// ── RPC URL ────────────────────────────────────────────────────────────────────
const rpcUrl =
  process.env.NEXT_PUBLIC_QUICKNODE_SEPOLIA_RPC_URL ||
  process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC ||
  "https://sepolia-rollup.arbitrum.io/rpc";

// ── WalletConnect Project ID ───────────────────────────────────────────────────
const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  "00000000000000000000000000000000";

export const config = getDefaultConfig({
  appName: "T-BillFlow",
  projectId,
  chains: [arbitrumSepolia],
  wallets: [
    {
      groupName: "Popular",
      wallets: [injectedWallet, metaMaskWallet],
    },
  ],
  transports: {
    [arbitrumSepolia.id]: http(rpcUrl),
  },
  ssr: true,
});


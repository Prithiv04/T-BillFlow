import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { arbitrumSepolia } from "wagmi/chains";
import { http } from "wagmi";

// ── RPC URL ────────────────────────────────────────────────────────────────────
const rpcUrl =
  process.env.NEXT_PUBLIC_QUICKNODE_SEPOLIA_RPC_URL ||
  process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC ||
  "https://sepolia-rollup.arbitrum.io/rpc";

// ── WalletConnect Project ID ───────────────────────────────────────────────────
// A real project ID from https://cloud.walletconnect.com is needed for
// WalletConnect QR-code scanning. For MetaMask (injected), it is NOT needed
// and the ConnectButton will work without it.
// Using a zeroed placeholder so WalletConnect initialises without crashing,
// while MetaMask and other injected wallets still function normally.
const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  "00000000000000000000000000000000";

export const config = getDefaultConfig({
  appName: "T-BillFlow",
  projectId,
  chains: [arbitrumSepolia],
  transports: {
    [arbitrumSepolia.id]: http(rpcUrl),
  },
  ssr: true,
});


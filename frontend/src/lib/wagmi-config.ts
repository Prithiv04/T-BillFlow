import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { arbitrumSepolia } from "wagmi/chains";
import { http } from "wagmi";

const rpcUrl =
  process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC ||
  "https://sepolia-rollup.arbitrum.io/rpc";

// WalletConnect Project ID — configure via NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID.
// When not configured, a fallback placeholder prevents static build failure while injected wallets continue to work.
const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "tbillflow-community-fallback";

export const config = getDefaultConfig({
  appName: "T-BillFlow 2.0",
  projectId: projectId,
  chains: [arbitrumSepolia],
  transports: {
    [arbitrumSepolia.id]: http(rpcUrl),
  },
  ssr: true,
});

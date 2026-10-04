import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { arbitrumSepolia } from "wagmi/chains";
import { http } from "wagmi";

// ── RPC URL for Viem/Wagmi transport ──────────────────────────────────────────
// QuickNode endpoints contain API tokens and MUST NOT be used in NEXT_PUBLIC_*
// variables, since those are embedded in the client bundle. Instead:
//   - Server-side agent uses QUICKNODE_SEPOLIA_RPC_URL (see agent/config.py)
//   - Frontend uses NEXT_PUBLIC_QUICKNODE_SEPOLIA_RPC_URL *only* if you
//     intentionally provision a browser-safe (no-auth / IP-restricted) URL.
//   - Otherwise, set NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC to a browser-safe
//     private or public RPC and leave QuickNode for server-side use only.
const rpcUrl =
  process.env.NEXT_PUBLIC_QUICKNODE_SEPOLIA_RPC_URL ||
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

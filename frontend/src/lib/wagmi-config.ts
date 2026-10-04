import { getDefaultConfig, type Wallet, type WalletDetailsParams } from "@rainbow-me/rainbowkit";
import { injectedWallet } from "@rainbow-me/rainbowkit/wallets";
import { createConnector, fallback, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { arbitrumSepolia } from "wagmi/chains";

// ── RPC URLs (Alchemy with public fallback) ────────────────────────────────────
const primaryRpc =
  process.env.NEXT_PUBLIC_QUICKNODE_SEPOLIA_RPC_URL ||
  process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC ||
  "https://arb-sepolia.g.alchemy.com/v2/alch_ItBnSEnpLz2Q46FjQn7zN";

const fallbackRpc = "https://sepolia-rollup.arbitrum.io/rpc";

// ── WalletConnect Project ID ───────────────────────────────────────────────────
const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  "00000000000000000000000000000000";

// Direct MetaMask injected wallet: connects via standard window.ethereum without
// spinning up the buggy @metamask/sdk relay which hangs on "Confirm connection in extension".
const directMetaMaskWallet = (): Wallet => ({
  id: "metaMask",
  name: "MetaMask",
  rdns: "io.metamask",
  iconUrl: "https://raw.githubusercontent.com/rainbow-me/rainbowkit/master/packages/rainbowkit/src/wallets/walletConnectors/metaMaskWallet/metaMaskWallet.svg",
  iconBackground: "#fff",
  installed:
    typeof window !== "undefined" &&
    Boolean(
      (window as any).ethereum?.isMetaMask ||
        (window as any).ethereum?.providers?.some((p: any) => p?.isMetaMask)
    ),
  downloadUrls: {
    chrome:
      "https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn",
  },
  createConnector: (walletDetails: WalletDetailsParams) => {
    return createConnector((config) => ({
      ...injected({ target: "metaMask" })(config),
      ...walletDetails,
    }));
  },
});

export const config = getDefaultConfig({
  appName: "T-BillFlow",
  projectId,
  chains: [arbitrumSepolia],
  wallets: [
    {
      groupName: "Popular",
      wallets: [directMetaMaskWallet, injectedWallet],
    },
  ],
  transports: {
    [arbitrumSepolia.id]: fallback([http(primaryRpc), http(fallbackRpc)]),
  },
  ssr: true,
});


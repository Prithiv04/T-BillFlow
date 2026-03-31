import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { bscTestnet } from "wagmi/chains";
import { http } from "wagmi";

const rpcUrl =
  process.env.NEXT_PUBLIC_BSC_TESTNET_RPC ||
  "https://bsc-testnet-rpc.publicnode.com";

export const config = getDefaultConfig({
  appName: "T-BillFlow",
  projectId: "tbillflow_demo_2024",
  chains: [bscTestnet],
  transports: {
    [bscTestnet.id]: http(rpcUrl),
  },
  ssr: true,
});

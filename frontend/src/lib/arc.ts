export const ARC_TESTNET = {
  id: Number(process.env.NEXT_PUBLIC_ARC_CHAIN_ID) || 5042002,
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 6,
  },
  rpcUrls: {
    default: process.env.NEXT_PUBLIC_ARC_RPC_URL || "https://rpc.testnet.arc.network",
  },
  blockExplorers: {
    default: "https://testnet.arcscan.app",
  },
};

export function getArcChainParams() {
  return {
    chainId: "0x" + ARC_TESTNET.id.toString(16),
    chainName: ARC_TESTNET.name,
    nativeCurrency: ARC_TESTNET.nativeCurrency,
    rpcUrls: [ARC_TESTNET.rpcUrls.default],
    blockExplorerUrls: [ARC_TESTNET.blockExplorers.default],
  };
}

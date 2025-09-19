
import { BrowserProvider } from "ethers";

const AVALANCHE_PARAMS = {
  chainId: "0xA86A", // 43114 in hex
  chainName: "Avalanche C-Chain",
  nativeCurrency: { name: "Avalanche", symbol: "AVAX", decimals: 18 },
  rpcUrls: ["https://api.avax.network/ext/bc/C/rpc"],
  blockExplorerUrls: ["https://snowtrace.io/"]
};

export async function connectMetaMask(setSigner) {
  let provider;
  if (window.ethereum?.providers) {
    const foundProvider = window.ethereum.providers.find((p) => p.isMetaMask);
    if (foundProvider) {
      provider = new BrowserProvider(foundProvider);
    }
  } else if (window.ethereum?.isMetaMask) {
    provider = new BrowserProvider(window.ethereum);
  }

  if (!provider) {
    throw new Error("MetaMask is not installed");
  }

  await provider.send("eth_requestAccounts", []);

  try {
    await provider.send("wallet_switchEthereumChain", [{ chainId: AVALANCHE_PARAMS.chainId }]);
  } catch (switchError) {
    // If not added, add it first
    if (switchError.code === 4902) {
      await provider.send("wallet_addEthereumChain", [{...AVALANCHE_PARAMS}]);
    } else {
      console.error("Switch chain error:", switchError);
      throw new Error("Failed to switch to Avalanche C-Chain.");
    }
  }


  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  setSigner(signer)

  return { provider, signer, address };
}

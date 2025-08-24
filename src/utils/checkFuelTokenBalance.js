import {Contract, JsonRpcProvider} from "ethers";
import { ERC20_ABI } from "./erc20Abi";

const TOKEN_ADDRESS = process.env.REACT_APP_FUEL_TOKEN_ADDRESS;
const REQUIRED_MIN = BigInt(process.env.REACT_APP_MIN_FUEL_TOKENS || "10000000"); // whole tokens
const AVALANCHE_PARAMS = {
  chainId: "0xA86A", // 43114 in hex
  chainName: "Avalanche C-Chain",
  nativeCurrency: { name: "Avalanche", symbol: "AVAX", decimals: 18 },
  rpcUrls: ["https://api.avax.network/ext/bc/C/rpc"],
  blockExplorerUrls: ["https://snowtrace.io/"]
};

async function switchToAvalanche(provider) {
  const {chainId} = AVALANCHE_PARAMS;

  try {
    await provider.send("wallet_switchEthereumChain", [{ chainId }]);
  } catch (err) {
    // If not added, add it
    if (err.code === 4902) {
      await provider.send("wallet_addEthereumChain", [{...AVALANCHE_PARAMS}]);
    } else {
      console.log({err});
      throw err;
    }
  }
}

export async function checkTokenBalance(userAddress) {
  if (!userAddress) throw new Error("Wallet not connected");

  const rpcProvider = new JsonRpcProvider("https://api.avax.network/ext/bc/C/rpc");
  const contract = new Contract(TOKEN_ADDRESS, ERC20_ABI, rpcProvider);

  let raw, decimals;
  try {
    [decimals, raw] = await Promise.all([
      contract.decimals(),
      contract.balanceOf(userAddress)
    ]);
  } catch (err) {
    console.error("ERC20 call failed:", err);
    return { ok: false, balance: 0n, decimals: 0, threshold: 0n };
  }


  const factor = 10n ** BigInt(decimals);
  const threshold = REQUIRED_MIN * factor; // bigint math

  return {
    ok: raw >= threshold, // bigint comparison
    balance: raw,
    decimals,
    threshold
  };
}

export async function hasEnoughFuelTokens(provider, userAddress) {
  if (!provider || !userAddress) throw new Error("Wallet not connected");
  if (!TOKEN_ADDRESS) throw new Error("TOKEN_ADDRESS is not set");

  await switchToAvalanche(provider);

  const rpcProvider = new JsonRpcProvider("https://api.avax.network/ext/bc/C/rpc");

  const contract = new Contract(TOKEN_ADDRESS, ERC20_ABI, rpcProvider);

  let raw, decimals;
  try {
    [decimals, raw] = await Promise.all([
      contract.decimals(),
      contract.balanceOf(userAddress)
    ]);
  } catch (err) {
    console.error("ERC20 call failed:", err);
    return { ok: false, balance: 0n, decimals: 0, threshold: 0n };
  }


  const factor = 10n ** BigInt(decimals);
  const threshold = REQUIRED_MIN * factor; // bigint math

  return {
    ok: raw >= threshold, // bigint comparison
    balance: raw,
    decimals,
    threshold
  };
}

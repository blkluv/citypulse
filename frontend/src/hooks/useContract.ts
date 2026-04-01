"use client";

import { useState, useCallback, useEffect } from "react";
import { BrowserProvider, Contract, formatEther, Network } from "ethers";
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "@/lib/contract";
import { ARC_TESTNET, getArcChainParams } from "@/lib/arc";

// Define Arc network WITHOUT ENS — prevents getEnsAddress calls
const arcNetwork = new Network("arc-testnet", ARC_TESTNET.id);

interface ContractState {
  address: string | null;
  balance: string;
  chainId: number | null;
  isConnecting: boolean;
  error: string | null;
}

export function useContract() {
  const [state, setState] = useState<ContractState>({
    address: null,
    balance: "0",
    chainId: null,
    isConnecting: false,
    error: null,
  });

  const getProvider = useCallback(() => {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("MetaMask not found");
    }
    const provider = new BrowserProvider(window.ethereum, arcNetwork);
    // Arc Testnet has no ENS — override resolveName to skip ENS lookup entirely
    provider.resolveName = async (name: string) => name;
    return provider;
  }, []);

  const switchToArc = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x" + ARC_TESTNET.id.toString(16) }],
      });
    } catch (err: unknown) {
      const switchError = err as { code?: number };
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [getArcChainParams()],
        });
      }
    }
  }, []);

  const connect = useCallback(async () => {
    // Check MetaMask installed
    if (typeof window === "undefined" || !window.ethereum) {
      setState((s) => ({
        ...s,
        error: "MetaMask not installed. Please install MetaMask to use CityPulse.",
      }));
      return;
    }

    setState((s) => ({ ...s, isConnecting: true, error: null }));
    try {
      const provider = getProvider();
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const balance = formatEther(await provider.getBalance(address));
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      setState({
        address,
        balance,
        chainId,
        isConnecting: false,
        error: null,
      });

      if (chainId !== ARC_TESTNET.id) {
        await switchToArc();
      }
    } catch (err: unknown) {
      const error = err as Error;
      setState((s) => ({
        ...s,
        isConnecting: false,
        error: error.message || "Failed to connect",
      }));
    }
  }, [getProvider, switchToArc]);

  const disconnect = useCallback(() => {
    setState({
      address: null,
      balance: "0",
      chainId: null,
      isConnecting: false,
      error: null,
    });
  }, []);

  const payForRoute = useCallback(
    async (fromZone: string, toZone: string, vehicleCount: number) => {
      const provider = getProvider();
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const price = await contract.queryPrice();
      const totalCost = price * BigInt(vehicleCount);

      // Check balance before submitting
      const balance = await provider.getBalance(address);
      if (balance < totalCost) {
        throw new Error(
          `Insufficient USDC balance. Need ${formatEther(totalCost)} USDC. Get testnet USDC from faucet.circle.com`
        );
      }

      const tx = await contract.payForRoute(fromZone, toZone, vehicleCount, {
        value: totalCost,
      });
      const receipt = await tx.wait();
      return { txHash: receipt.hash, cost: formatEther(totalCost) };
    },
    [getProvider]
  );

  const getStats = useCallback(async () => {
    const provider = getProvider();
    const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    const [totalQueriesCount, totalRevenueAmount, currentPrice, contractBalance] =
      await contract.getStats();
    return {
      totalQueries: Number(totalQueriesCount),
      totalRevenue: formatEther(totalRevenueAmount),
      queryPrice: formatEther(currentPrice),
      balance: formatEther(contractBalance),
    };
  }, [getProvider]);

  const payForParking = useCallback(
    async (zone: string) => {
      const provider = getProvider();
      const signer = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const price = await contract.parkingQueryPrice();

      const tx = await contract.payForParking(zone, {
        value: price,
      });
      const receipt = await tx.wait();
      return { txHash: receipt.hash, cost: formatEther(price) };
    },
    [getProvider]
  );

  const getQueryPrice = useCallback(async () => {
    const provider = getProvider();
    const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    const price = await contract.queryPrice();
    return formatEther(price);
  }, [getProvider]);

  const getParkingQueryPrice = useCallback(async () => {
    const provider = getProvider();
    const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    const price = await contract.parkingQueryPrice();
    return formatEther(price);
  }, [getProvider]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        setState((s) => ({ ...s, address: accounts[0] }));
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener(
        "accountsChanged",
        handleAccountsChanged
      );
      window.ethereum?.removeListener("chainChanged", handleChainChanged);
    };
  }, [disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    payForRoute,
    payForParking,
    getStats,
    getQueryPrice,
    getParkingQueryPrice,
  };
}

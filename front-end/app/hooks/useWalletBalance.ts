import { useState, useEffect } from "react";
import { usePrivyWallet } from "./usePrivyWallet";
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getSolanaRpcUrl } from "../lib/solana-config";

const SOL_PRICE_API = "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd";

export function useWalletBalance() {
  const [balance, setBalance] = useState<number>(0);
  const [usdValue, setUsdValue] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [solPrice, setSolPrice] = useState<number | null>(null);
  
  const { isConnected, publicKey, wallet } = usePrivyWallet();

  // Fetch SOL price from CoinGecko
  useEffect(() => {
    const fetchSolPrice = async () => {
      try {
        const response = await fetch(SOL_PRICE_API, {
          headers: {
            'Accept': 'application/json',
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.solana?.usd) {
          setSolPrice(data.solana.usd);
        }
      } catch (err) {
        // Silently fail - price fetch is non-critical
        if (err instanceof Error && err.message.includes('Failed to fetch')) {
          console.warn("Unable to fetch SOL price - check your network connection");
        }
      }
    };

    fetchSolPrice();
    const interval = setInterval(fetchSolPrice, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch actual wallet balance
  useEffect(() => {
    const fetchBalance = async (showLoading: boolean) => {
      if (!isConnected || !publicKey) {
        setBalance(0);
        setUsdValue(null);
        setIsLoading(false);
        return;
      }

      try {
        if (showLoading) {
          setIsLoading(true);
        }
        // Usar configuração centralizada para garantir consistência com Privy
        const rpcUrl = getSolanaRpcUrl();
        const connection = new Connection(rpcUrl, 'confirmed');
        const lamports = await connection.getBalance(publicKey);
        const solBalance = lamports / LAMPORTS_PER_SOL;
        setBalance(solBalance);
        setError(null);
      } catch (err) {
        console.error("Error fetching balance:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch balance");
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    };

    fetchBalance(true);
    
    // Refresh balance every 10 seconds if connected
    let interval: NodeJS.Timeout | null = null;
    
    if (isConnected && publicKey) {
      interval = setInterval(() => {
        fetchBalance(false);
      }, 10000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isConnected, publicKey]);

  // Calculate USD value
  useEffect(() => {
    if (balance > 0 && solPrice) {
      setUsdValue(balance * solPrice);
    } else {
      setUsdValue(null);
    }
  }, [balance, solPrice]);

  const formattedBalance = balance.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  });

  return {
    balance,
    formattedBalance,
    usdValue,
    isLoading,
    error,
    isConnected,
    address: wallet || '',
  };
}

import { useState, useEffect } from "react";

export function useWalletBalance() {
  const [usdValue, setUsdValue] = useState<number | null>(null);
  const isConnected = true; // Sempre conectado no modo mock
  const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'; // Endereço mockado
  const isLoading = false;
  const error = null;

  // Saldo mockado (entre 1 e 10 ETH)
  const balance = 5.2543; 
  const formattedBalance = balance.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  });

  // Calcular valor em USD usando preço estimado de ETH
  useEffect(() => {
    if (isConnected) {
      const estimatedUsdValue = balance * 2500; // Estimativa de preço do ETH
      setUsdValue(estimatedUsdValue);
    } else {
      setUsdValue(null);
    }
  }, [balance, isConnected]);

  return {
    balance,
    formattedBalance,
    usdValue,
    isLoading,
    error,
    isConnected,
    address,
  };
} 
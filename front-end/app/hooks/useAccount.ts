// Hook mockado para substituir useAccount do Wagmi
export function useAccount() {
  return {
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' as `0x${string}`,
    isConnected: true,
    isConnecting: false,
    isDisconnected: false,
    isReconnecting: false,
    status: 'connected' as const,
    connector: null,
    chain: {
      id: 2810,
      name: 'Mock Network',
    },
  };
}

// Hook mockado para substituir useDisconnect do Wagmi
export function useDisconnect() {
  return {
    disconnect: () => {
      console.log('Mock disconnect called - no action taken');
    },
    isLoading: false,
    isSuccess: false,
    isError: false,
    error: null,
  };
}


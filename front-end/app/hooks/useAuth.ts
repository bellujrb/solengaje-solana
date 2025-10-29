"use client";

import { usePrivy } from "@privy-io/react-auth";

// Hook simplificado que usa Privy diretamente
export function useAuth() {
  const privyResult = usePrivy();
  
  // Fallback para quando Privy não está disponível (SSR)
  if (!privyResult || !privyResult.ready) {
    return {
      authenticated: false,
      user: null,
      login: async () => {},
      logout: async () => {},
      ready: false,
      isConnected: false,
      walletAddress: undefined,
    };
  }
  
  const { authenticated, user, login, logout, ready } = privyResult;
  
  // Verificar se tem wallet conectada
  const isConnected = authenticated && !!user?.wallet?.address;
  
  return {
    authenticated,
    user,
    login,
    logout,
    ready,
    isConnected,
    walletAddress: user?.wallet?.address,
  };
}

export function useDisconnect() {
  const privyResult = usePrivy();
  
  if (!privyResult) {
    return {
      disconnect: async () => {},
    };
  }
  
  return {
    disconnect: privyResult.logout,
  };
}

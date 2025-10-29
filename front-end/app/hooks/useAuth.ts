"use client";

import { usePrivy } from "@privy-io/react-auth";

// Hook simplificado que usa Privy diretamente
export function useAuth() {
  const { authenticated, user, login, logout, ready } = usePrivy();
  
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
  const { logout } = usePrivy();
  
  return {
    disconnect: logout,
  };
}

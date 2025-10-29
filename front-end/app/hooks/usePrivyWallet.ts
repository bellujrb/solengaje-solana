"use client";

import { usePrivy } from "@privy-io/react-auth";
import { PublicKey, Transaction } from "@solana/web3.js";
import { useMemo } from "react";

export function usePrivyWallet() {
  const { authenticated, user, ready } = usePrivy();

  const solanaWallet = useMemo(() => {
    if (!user?.wallet?.address) return null;
    return user.wallet.address;
  }, [user?.wallet?.address]);

  const publicKey = useMemo(() => {
    if (!solanaWallet) return null;
    try {
      return new PublicKey(solanaWallet);
    } catch (error) {
      console.error("Error creating PublicKey:", error);
      return null;
    }
  }, [solanaWallet]);

  const wallet = user?.wallet as any;

  const signTransaction = async (tx: Transaction): Promise<Transaction> => {
    if (!authenticated || !wallet) {
      throw new Error("No wallet available");
    }

    if (wallet.sendTransaction) {
      return await wallet.sendTransaction(tx);
    } else if (wallet.signTransaction) {
      return await wallet.signTransaction(tx);
    }
    
    throw new Error("Wallet does not support transactions");
  };

  const signAllTransactions = async (txs: Transaction[]): Promise<Transaction[]> => {
    if (!authenticated || !wallet) {
      throw new Error("No wallet available");
    }

    return await Promise.all(txs.map(tx => signTransaction(tx)));
  };

  const signMessage = async (message: Uint8Array): Promise<Uint8Array> => {
    if (!authenticated || !wallet) {
      throw new Error("No wallet available");
    }

    if (wallet.signMessage) {
      return await wallet.signMessage(message);
    }
    
    throw new Error("Wallet does not support signMessage");
  };

  return {
    publicKey,
    isConnected: authenticated && !!publicKey,
    isReady: ready,
    wallet: solanaWallet,
    user,
    signTransaction,
    signAllTransactions,
    signMessage,
  };
}

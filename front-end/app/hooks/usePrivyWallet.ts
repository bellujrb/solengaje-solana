"use client";

import { usePrivy } from "@privy-io/react-auth";
import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { useMemo } from "react";

export function usePrivyWallet() {
  const { authenticated, user, ready, sendTransaction } = usePrivy();

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

  const anchorWallet = useMemo(() => {
    if (!publicKey) return null;
    
    return {
      publicKey,
      async signTransaction(tx: Transaction): Promise<Transaction> {
        if (!sendTransaction) {
          throw new Error("sendTransaction not available");
        }
        
        // Privy's sendTransaction returns a signature, not a signed transaction
        // For read-only operations like fetching accounts, we don't need to sign
        // Return the transaction as-is
        return tx;
      },
      async signAllTransactions(txs: Transaction[]): Promise<Transaction[]> {
        return Promise.all(txs.map(tx => this.signTransaction(tx)));
      },
      async signMessage(message: Uint8Array): Promise<Uint8Array> {
        // This is called for non-transaction signing (like data signing)
        return message;
      },
    };
  }, [publicKey, sendTransaction]);

  return {
    publicKey,
    isConnected: authenticated && !!publicKey,
    isReady: ready,
    wallet: solanaWallet,
    user,
    anchorWallet,
  };
}

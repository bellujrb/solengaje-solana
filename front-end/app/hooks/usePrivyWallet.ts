"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useWallets as useSolanaWallets, useSignAndSendTransaction } from "@privy-io/react-auth/solana";
import { PublicKey, Transaction } from "@solana/web3.js";
import { useMemo } from "react";

export function usePrivyWallet() {
  const { authenticated, user, ready } = usePrivy();
  
  // Hooks MUST be called unconditionally (React rules)
  // These hooks access Privy context which may not be ready yet
  // If they throw, React will catch and the component will re-render when ready
  let walletsHook: ReturnType<typeof useSolanaWallets>;
  let signHook: ReturnType<typeof useSignAndSendTransaction>;
  
  // Always call hooks - they may throw if context is not available
  // This is expected and React will handle re-rendering
  try {
    walletsHook = useSolanaWallets();
  } catch (error: any) {
    // Return safe defaults if hooks fail due to provider not ready
    // Use 'as any' to bypass type checking for error case
    walletsHook = { wallets: [] } as any;
  }
  
  try {
    signHook = useSignAndSendTransaction();
  } catch (error: any) {
    // Return safe defaults if hooks fail due to provider not ready
    // Use 'as any' to bypass type checking for error case
    signHook = { signAndSendTransaction: null as any } as any;
  }
  
  // Extract values safely
  const solanaWallets = useMemo(() => {
    if (!ready) return [];
    return walletsHook?.wallets || [];
  }, [ready, walletsHook?.wallets]);
  
  const signAndSendTransaction = useMemo(() => {
    if (!ready) return null;
    return signHook?.signAndSendTransaction || null;
  }, [ready, signHook?.signAndSendTransaction]);

  // Pegar a primeira wallet Solana disponível
  const solanaWallet = useMemo(() => {
    // Usa useWallets do módulo Solana (retorna apenas wallets Solana)
    // IMPORTANTE: Deve usar apenas wallets do módulo Solana para garantir compatibilidade
    if (solanaWallets && solanaWallets.length > 0) {
      return solanaWallets[0];
    }
    
    return null;
  }, [solanaWallets]);

  const solanaWalletAddress = useMemo(() => {
    if (!solanaWallet) return null;
    return solanaWallet.address;
  }, [solanaWallet]);

  const publicKey = useMemo(() => {
    if (!solanaWalletAddress) return null;
    try {
      return new PublicKey(solanaWalletAddress);
    } catch (error) {
      console.error("Error creating PublicKey:", error);
      return null;
    }
  }, [solanaWalletAddress]);

  const anchorWallet = useMemo(() => {
    if (!publicKey || !solanaWallet) return null;
    
    return {
      publicKey,
      async signTransaction(tx: Transaction): Promise<Transaction> {
        // Para operações de leitura, não precisa assinar
        if (!tx.recentBlockhash) {
          return tx;
        }
        
        // Para escrita, o Privy embedded wallet assina via RPC interno
        // Adicionar a assinatura vazia do fee payer para o Anchor aceitar
        tx.feePayer = publicKey;
        
        // Retornar a transação - o Anchor vai enviá-la via provider.sendAndConfirm
        // que internamente chama o RPC do Privy
        return tx;
      },
      async signAllTransactions(txs: Transaction[]): Promise<Transaction[]> {
        return Promise.all(txs.map(tx => this.signTransaction(tx)));
      },
      async signMessage(message: Uint8Array): Promise<Uint8Array> {
        return message;
      },
    };
  }, [publicKey, solanaWallet]);

  // Wrapper para sendTransaction que usa a wallet Solana correta
  const sendTransaction = useMemo(() => {
    if (!solanaWallet || !signAndSendTransaction) return undefined;
    
    return async (serializedTx: Uint8Array | Buffer) => {
      if (!solanaWallet.address) {
        throw new Error('No wallet address found');
      }
      
      // Verificar se a wallet é válida
      if (!solanaWallet || typeof solanaWallet.address !== 'string') {
        throw new Error('Invalid Solana wallet');
      }
      
      // signAndSendTransaction espera Buffer ou Uint8Array
      const txBuffer = Buffer.isBuffer(serializedTx) 
        ? serializedTx 
        : Buffer.from(serializedTx);
      
      try {
        // Verificar a estrutura da wallet
        console.log('Wallet structure:', {
          address: solanaWallet.address,
          hasStandardWallet: !!solanaWallet.standardWallet,
          walletKeys: Object.keys(solanaWallet),
        });
        
        // signAndSendTransaction espera a wallet e a transação
        // A wallet precisa ter a estrutura correta do módulo Solana
        const result = await signAndSendTransaction({
          transaction: txBuffer,
          wallet: solanaWallet,
        });
        
        // Retornar a signature
        return typeof result === 'string' 
          ? result 
          : (result as any)?.signature || (result as any)?.hash || String(result);
      } catch (error) {
        console.error('Error in signAndSendTransaction:', error);
        console.error('Wallet:', solanaWallet);
        console.error('Wallet type:', typeof solanaWallet);
        console.error('Transaction buffer length:', txBuffer.length);
        // Tentar usar standardWallet se disponível
        if ((solanaWallet as any)?.standardWallet?.sendTransaction) {
          console.log('Trying standardWallet.sendTransaction');
          try {
            const tx = Transaction.from(txBuffer);
            const result = await (solanaWallet as any).standardWallet.sendTransaction(tx);
            return typeof result === 'string' 
              ? result 
              : (result as any)?.signature || String(result);
          } catch (fallbackError) {
            console.error('Fallback also failed:', fallbackError);
          }
        }
        throw error;
      }
    };
  }, [solanaWallet, signAndSendTransaction]);

  return {
    publicKey,
    isConnected: authenticated && !!publicKey,
    isReady: ready,
    wallet: solanaWalletAddress,
    user,
    anchorWallet,
    sendTransaction,
    solanaWallet, // Exportar também para referência
  };
}

"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useWallets as useSolanaWallets, useSignAndSendTransaction, useSignTransaction } from "@privy-io/react-auth/solana";
import { PublicKey, Transaction, Connection } from "@solana/web3.js";
import { useMemo } from "react";
import { getConnection } from "../lib/anchor";

export function usePrivyWallet() {
  const { authenticated, user, ready } = usePrivy();
  
  // Hooks MUST be called unconditionally (React rules)
  // These hooks access Privy context which may not be ready yet
  // If they throw, React will catch and the component will re-render when ready
  let walletsHook: ReturnType<typeof useSolanaWallets>;
  let signHook: ReturnType<typeof useSignAndSendTransaction>;
  let signTxHook: ReturnType<typeof useSignTransaction>;
  
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
  
  try {
    signTxHook = useSignTransaction();
  } catch (error: any) {
    // Return safe defaults if hooks fail due to provider not ready
    signTxHook = { signTransaction: null as any } as any;
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
  
  const signTransaction = useMemo(() => {
    if (!ready) return null;
    return signTxHook?.signTransaction || null;
  }, [ready, signTxHook?.signTransaction]);

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
    if (!solanaWallet) return undefined;
    
    return async (serializedTx: Uint8Array | Buffer) => {
      if (!solanaWallet.address) {
        throw new Error('No wallet address found');
      }
      
      // signAndSendTransaction espera Buffer ou Uint8Array
      const txBuffer = Buffer.isBuffer(serializedTx) 
        ? serializedTx 
        : Buffer.from(serializedTx);
      
      try {
        // Tentar primeiro usar signTransaction + enviar manualmente (evita funding)
        if (signTransaction) {
          try {
            console.log('Using signTransaction + manual send');
            // Converter para Transaction
            const tx = Transaction.from(txBuffer);
            
            // Assinar a transação
            const signedResult = await signTransaction({
              transaction: txBuffer,
              wallet: solanaWallet,
            });
            
            // Enviar a transação assinada manualmente
            const connection = getConnection();
            const signature = await connection.sendRawTransaction(
              signedResult.signedTransaction,
              { skipPreflight: false }
            );
            
            console.log('Transaction sent with signature:', signature);
            return signature;
          } catch (signError: any) {
            console.warn('signTransaction + manual send failed, trying signAndSendTransaction:', signError.message);
            // Fall through para signAndSendTransaction
          }
        }
        
        // Se signTransaction não funcionar, tentar signAndSendTransaction
        // Note: pode dar erro de funding se não estiver habilitado
        if (signAndSendTransaction) {
          try {
            console.log('Using signAndSendTransaction');
            const result = await signAndSendTransaction({
              transaction: txBuffer,
              wallet: solanaWallet,
            });
            
            // Resultado pode ser Uint8Array ou objeto com signature
            if (result?.signature) {
              const sig = result.signature;
              return Buffer.from(sig).toString('base64');
            }
            return typeof result === 'string' ? result : String(result);
          } catch (sendError: any) {
            console.error('signAndSendTransaction failed:', sendError);
            // Se der erro de funding, não há muito o que fazer além de lançar o erro
            throw sendError;
          }
        }
        
        throw new Error('No transaction sending method available. Please ensure wallet is properly connected.');
      } catch (error: any) {
        console.error('Error sending transaction:', error);
        throw error;
      }
    };
  }, [solanaWallet, signTransaction, signAndSendTransaction]);

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

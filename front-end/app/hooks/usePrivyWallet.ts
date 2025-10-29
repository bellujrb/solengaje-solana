"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useWallets as useSolanaWallets, useSignAndSendTransaction, useSignTransaction } from "@privy-io/react-auth/solana";
import { PublicKey, Transaction, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useMemo } from "react";
import { getConnection } from "../lib/anchor";
import { getSolanaNetworkKey } from "../lib/solana-config";

export function usePrivyWallet() {
  const { authenticated, user, ready } = usePrivy();
  
  let walletsHook: ReturnType<typeof useSolanaWallets>;
  let signHook: ReturnType<typeof useSignAndSendTransaction>;
  let signTxHook: ReturnType<typeof useSignTransaction>;
  
  try {
    walletsHook = useSolanaWallets();
  } catch (error: any) {
    walletsHook = { wallets: [] } as any;
  }
  
  try {
    signHook = useSignAndSendTransaction();
  } catch (error: any) {
    signHook = { signAndSendTransaction: null as any } as any;
  }
  
  try {
    signTxHook = useSignTransaction();
  } catch (error: any) {
    signTxHook = { signTransaction: null as any } as any;
  }
  
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

  const solanaWallet = useMemo(() => {
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
        if (!tx.recentBlockhash) {
          return tx;
        }
        
        tx.feePayer = publicKey;
        
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

  const networkKey = getSolanaNetworkKey();

  const sendTransaction = useMemo(() => {
    if (!solanaWallet || !ready) return undefined;
    
    return async (serializedTx: Uint8Array | Buffer) => {
      if (!ready) {
        throw new Error('Wallet is not ready yet. Please wait for initialization.');
      }
      
      if (!solanaWallet.address) {
        throw new Error('No wallet address found');
      }
      
      const txBuffer = Buffer.isBuffer(serializedTx) 
        ? serializedTx 
        : Buffer.from(serializedTx);
      
      try {
        const connection = getConnection();
        const tx = Transaction.from(txBuffer);
        const walletPublicKey = new PublicKey(solanaWallet.address);
        
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
        tx.recentBlockhash = blockhash;
        
        if (!tx.feePayer) {
          tx.feePayer = walletPublicKey;
        }
        
        const freshSerializedTx = tx.serialize({
          requireAllSignatures: false,
          verifySignatures: false,
        });
        
        if (signTransaction) {
          try {
            const signedResult = await signTransaction({
              transaction: freshSerializedTx,
              wallet: solanaWallet,
              chain: networkKey, 
            });
            
            const signature = await connection.sendRawTransaction(
              signedResult.signedTransaction,
              { 
                // Simulação de transação para evitar erro de DeclaredProgramIdMismatch
                skipPreflight: true,
                maxRetries: 3,
              }
            );
            
            await connection.confirmTransaction({
              signature,
              blockhash,
              lastValidBlockHeight,
            }, 'confirmed');
            
            console.log('Transaction sent with signature:', signature);
            return signature;
          } catch (signError: any) {
            const errorMessage = signError?.message || String(signError);
            if (
              errorMessage.includes('Attempt to debit an account but found no record of a prior credit') ||
              errorMessage.includes('insufficient funds') ||
              errorMessage.includes('InsufficientFunds') ||
              errorMessage.includes('insufficient balance')
            ) {
              const balance = await connection.getBalance(walletPublicKey);
              const balanceInSol = balance / LAMPORTS_PER_SOL;
              throw new Error(
                `Saldo insuficiente para completar a transação. Você precisa de SOL suficiente para pagar as taxas. Saldo atual: ${balanceInSol.toFixed(6)} SOL. Por favor, adicione SOL à sua wallet.`
              );
            }
            
            console.warn('signTransaction + manual send failed, trying signAndSendTransaction:', signError.message);
          }
        }
        
        if (signAndSendTransaction) {
          try {
            console.log('Using signAndSendTransaction');
            const result = await signAndSendTransaction({
              transaction: freshSerializedTx,
              wallet: solanaWallet,
              chain: networkKey, 
            });
            
            if (result?.signature) {
              const sig = result.signature;
              return Buffer.from(sig).toString('base64');
            }
            return typeof result === 'string' ? result : String(result);
          } catch (sendError: any) {
            console.error('signAndSendTransaction failed:', sendError);
            
            const errorMessage = sendError?.message || String(sendError);
            if (
              errorMessage.includes('Attempt to debit an account but found no record of a prior credit') ||
              errorMessage.includes('insufficient funds') ||
              errorMessage.includes('InsufficientFunds') ||
              errorMessage.includes('insufficient balance')
            ) {
              const balance = await connection.getBalance(walletPublicKey);
              const balanceInSol = balance / LAMPORTS_PER_SOL;
              throw new Error(
                `Saldo insuficiente para completar a transação. Você precisa de SOL suficiente para pagar as taxas. Saldo atual: ${balanceInSol.toFixed(6)} SOL. Por favor, adicione SOL à sua wallet.`
              );
            }
            
            throw sendError;
          }
        }
        
        throw new Error('No transaction sending method available. Please ensure wallet is properly connected.');
      } catch (error: any) {
        console.error('Error sending transaction:', error);
        throw error;
      }
    };
  }, [solanaWallet, signTransaction, signAndSendTransaction, ready, networkKey]);

  return {
    publicKey,
    isConnected: authenticated && !!publicKey,
    isReady: ready,
    wallet: solanaWalletAddress,
    user,
    anchorWallet,
    sendTransaction,
    solanaWallet, 
  };
}

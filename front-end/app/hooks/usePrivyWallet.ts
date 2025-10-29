"use client";

import { usePrivy } from "@privy-io/react-auth";
import {
  useWallets as useSolanaWallets,
  useSignAndSendTransaction,
  useSignTransaction,
} from "@privy-io/react-auth/solana";
import { useMemo } from "react";
import { PublicKey, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getConnection } from "../lib/anchor";
import { getSolanaNetworkKey } from "../lib/solana-config";

export function usePrivyWallet() {
  const { authenticated, user, ready } = usePrivy();

  // ✅ Hooks sempre chamados — nunca condicionais
  let walletsHook;
  let signHook;
  let signTxHook;

  try {
    walletsHook = useSolanaWallets();
  } catch {
    walletsHook = { wallets: [] };
  }

  try {
    signHook = useSignAndSendTransaction();
  } catch {
    signHook = { signAndSendTransaction: null };
  }

  try {
    signTxHook = useSignTransaction();
  } catch {
    signTxHook = { signTransaction: null };
  }

  // ✅ Agora usamos ready para decidir *como usar* o resultado, não se chamamos o hook
  const solanaWallets = useMemo(() => {
    return ready ? walletsHook.wallets ?? [] : [];
  }, [ready, walletsHook.wallets]);

  const signAndSendTransaction = useMemo(() => {
    return ready ? signHook.signAndSendTransaction ?? null : null;
  }, [ready, signHook.signAndSendTransaction]);

  const signTransaction = useMemo(() => {
    return ready ? signTxHook.signTransaction ?? null : null;
  }, [ready, signTxHook.signTransaction]);

  const solanaWallet = useMemo(() => solanaWallets[0] ?? null, [solanaWallets]);
  const solanaWalletAddress = solanaWallet?.address ?? null;

  const publicKey = useMemo(() => {
    if (!solanaWalletAddress) return null;
    try {
      return new PublicKey(solanaWalletAddress);
    } catch (err) {
      console.error("Invalid PublicKey:", err);
      return null;
    }
  }, [solanaWalletAddress]);

  const anchorWallet = useMemo(() => {
    if (!publicKey || !solanaWallet) return null;
    return {
      publicKey,
      async signTransaction(tx: Transaction): Promise<Transaction> {
        tx.feePayer = publicKey;
        return tx;
      },
      async signAllTransactions(txs: Transaction[]): Promise<Transaction[]> {
        return Promise.all(txs.map((tx) => this.signTransaction(tx)));
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
      const connection = getConnection();
      const txBuffer = Buffer.isBuffer(serializedTx)
        ? serializedTx
        : Buffer.from(serializedTx);

      const tx = Transaction.from(txBuffer);
      const walletPublicKey = new PublicKey(solanaWallet.address);
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;
      tx.feePayer = walletPublicKey;

      const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });

      const handleFundsError = async (err: Error) => {
        if (/(insufficient|debit|InsufficientFunds)/i.test(err.message)) {
          const balance = await connection.getBalance(walletPublicKey);
          const sol = balance / LAMPORTS_PER_SOL;
          throw new Error(`Saldo insuficiente: ${sol.toFixed(6)} SOL.`);
        }
      };

      try {
        if (signTransaction) {
          const signed = await signTransaction({
            transaction: serialized,
            wallet: solanaWallet,
            chain: networkKey,
          });
          const sig = await connection.sendRawTransaction(signed.signedTransaction, {
            skipPreflight: true,
            maxRetries: 3,
          });
          await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
          return sig;
        }
      } catch (err: any) {
        await handleFundsError(err);
        console.warn("signTransaction fallback:", err);
      }

      if (signAndSendTransaction) {
        try {
          const result = await signAndSendTransaction({
            transaction: serialized,
            wallet: solanaWallet,
            chain: networkKey,
          });
          return result?.signature
            ? Buffer.from(result.signature).toString("base64")
            : String(result);
        } catch (err: any) {
          await handleFundsError(err);
          throw err;
        }
      }

      throw new Error("No valid send method available.");
    };
  }, [solanaWallet, ready, signTransaction, signAndSendTransaction, networkKey]);

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

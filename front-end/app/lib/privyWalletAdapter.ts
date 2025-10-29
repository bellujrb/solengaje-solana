import { PublicKey, Transaction } from '@solana/web3.js';

export function toAnchorWallet(wallet: { address: string; standardWallet?: { signTransaction?: (tx: Transaction) => Promise<Transaction>; signAllTransactions?: (txs: Transaction[]) => Promise<Transaction[]> } }) {
  if (!wallet) return wallet;
  const publicKey = new PublicKey(wallet.address);
  const standard = wallet.standardWallet;

  return {
    publicKey,
    async signTransaction(tx: Transaction) {
      if (!standard?.signTransaction) {
        throw new Error('Privy wallet does not support signTransaction');
      }
      return await standard.signTransaction(tx);
    },
    async signAllTransactions(txs: Transaction[]) {
      if (!standard?.signAllTransactions) {
        if (!standard?.signTransaction) {
          throw new Error('Privy wallet does not support signAllTransactions or signTransaction');
        }
        const signTx = standard.signTransaction;
        return await Promise.all(txs.map((tx) => signTx(tx)));
      }
      return await standard.signAllTransactions(txs);
    },
  };
}

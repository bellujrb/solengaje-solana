import { AnchorProvider, Program, web3 } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import idl from './idl.json';

export const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID || 'DS6344gi387M4e6XvS99QQXGiDmY6qQi4xYxqGUjFbB3');
export const USDC_MINT = new PublicKey(process.env.NEXT_PUBLIC_USDC_MINT || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
export const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

export function getConnection() {
  return new Connection(RPC_URL, 'confirmed');
}

export function getProgram(wallet: any) {
  if (!wallet) {
    throw new Error('Wallet is required');
  }
  
  const connection = getConnection();
  
  // Criar um adapter compatível com Anchor
  const anchorWallet = {
    publicKey: wallet.publicKey || (typeof wallet.address === 'string' ? new PublicKey(wallet.address) : wallet),
    signTransaction: wallet.signTransaction || wallet,
    signAllTransactions: wallet.signAllTransactions || wallet,
  };
  
  const provider = new AnchorProvider(connection, anchorWallet as any, {
    commitment: 'confirmed',
    skipPreflight: false,
  });
  
  return new Program(idl as any, provider);
}

// PDA helpers
export function getOracleConfigPDA() {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('oracle-config')],
    PROGRAM_ID
  );
  return pda;
}

export function getCampaignPDA(influencer: PublicKey, createdAt: number) {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('campaign'),
      influencer.toBuffer(),
      Buffer.from(new BigInt64Array([BigInt(createdAt)]).buffer),
    ],
    PROGRAM_ID
  );
  return pda;
}

export async function getVaultTokenAccount(campaignPDA: PublicKey) {
  const { getAssociatedTokenAddress } = await import('@solana/spl-token');
  return getAssociatedTokenAddress(USDC_MINT, campaignPDA, true);
}

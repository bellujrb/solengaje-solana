import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import idl from './solengage.json';
import { getSolanaRpcUrl } from './solana-config';

export const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID || '2e3n681eydMY7t35bHD53eLfaifH3yQzQEsmgfhKV7E5');
export const USDC_MINT = new PublicKey(process.env.NEXT_PUBLIC_USDC_MINT || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

// Usar configuração centralizada para garantir consistência com Privy
export function getConnection() {
  const rpcUrl = getSolanaRpcUrl();
  return new Connection(rpcUrl, 'confirmed');
}

export function getProgram(wallet: unknown) {
  if (!wallet) {
    throw new Error('Wallet is required');
  }
  
  const connection = getConnection();
  
  // Criar um adapter compatível com Anchor
  const anchorWallet = {
    publicKey: (wallet as { publicKey?: PublicKey; address?: string }).publicKey || (typeof (wallet as { address?: string }).address === 'string' ? new PublicKey((wallet as { address: string }).address) : wallet),
    signTransaction: (wallet as { signTransaction?: unknown }).signTransaction || wallet,
    signAllTransactions: (wallet as { signAllTransactions?: unknown }).signAllTransactions || wallet,
  };
  
  const provider = new AnchorProvider(connection, anchorWallet as never, {
    commitment: 'confirmed',
    skipPreflight: false,
  });
  
  return new Program(idl as never, provider);
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

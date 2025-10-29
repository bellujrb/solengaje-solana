import { useState, useEffect, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { getConnection } from '../lib/anchor';
import { usePrivyWallet } from './usePrivyWallet';
import { convertMultipleCampaigns, convertBlockchainCampaignToUI } from '../utils/campaignConverter';
import idl from '../lib/idl.json';

export interface Campaign {
  id: string;
  brand: string;
  creator: string;
  totalValue: string;
  deadline: string;
  targetLikes: string;
  targetComments: string;
  targetViews: string;
  targetShares: string;
  currentLikes: string;
  currentComments: string;
  currentViews: string;
  currentShares: string;
  paidAmount: string;
  status: 'ACTIVE' | 'COMPLETED' | 'PENDING' | 'EXPIRED' | 'CANCELLED';
  progress: number;
  title: string;
  description: string;
  instagramUsername: string;
  createdAt: string;
  postsCount: number;
  endDate: string;
}

interface BlockchainCampaign {
  campaignPDA: PublicKey;
  influencer: PublicKey;
  brand: PublicKey;
  name: string;
  description: string;
  amountUsdc: BN;
  amountPaid: BN;
  targetLikes: BN;
  targetComments: BN;
  targetViews: BN;
  targetShares: BN;
  currentLikes: BN;
  currentComments: BN;
  currentViews: BN;
  currentShares: BN;
  deadlineTs: BN;
  instagramUsername: string;
  status: 'Pending' | 'Active' | 'Completed' | 'Cancelled' | 'Expired';
  createdAt: BN;
  posts: Array<{
    postId: string;
    postUrl: string;
    addedAt: BN;
  }>;
  bump: number;
}

function getProgram(walletAdapter: any) {
  const connection = getConnection();

  const provider = new AnchorProvider(connection, walletAdapter as any, {
    commitment: 'confirmed',
    skipPreflight: false,
  });

  return new Program(idl as any, provider);
}

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { publicKey, isConnected, user, anchorWallet } = usePrivyWallet();

  const fetchAllCampaigns = useCallback(async () => {
    if (!isConnected || !publicKey) {
      setCampaigns([]);
      setLoading(false);
      return;
    }

    // Não mostra loading no início se já tiver dados
    if (campaigns.length === 0) {
      setLoading(true);
    }
    setError(null);

    try {
      if (!anchorWallet) {
        throw new Error('Anchor wallet not available');
      }
      
      console.log('Fetching campaigns with publicKey:', publicKey.toBase58());
      
      const program = getProgram(anchorWallet);
      
      // Buscar todas as campanhas
      const campaignAccounts = await (program.account as any).campaign.all([
        // Filtrar por influencer (opcional)
        // { memcmp: { offset: 8, bytes: publicKey.toBase58() } }
      ]);

      console.log('Found campaigns:', campaignAccounts.length);

      const blockchainCampaigns = campaignAccounts.map((account: any) => ({
        campaignPDA: account.publicKey,
        ...account.account
      })) as BlockchainCampaign[];

      // Converter para o formato UI
      const convertedCampaigns = convertMultipleCampaigns(blockchainCampaigns);
      setCampaigns(convertedCampaigns);
    } catch (err) {
      console.error('Error fetching campaigns from blockchain:', err);
      console.error('Error details:', {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined
      });
      setError(err instanceof Error ? err.message : 'Failed to fetch campaigns');
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [isConnected, publicKey, anchorWallet]);

  const fetchCampaign = useCallback(async (campaignPDA: PublicKey): Promise<Campaign | null> => {
    if (!isConnected || !publicKey) {
      return null;
    }

    try {
      if (!anchorWallet) {
        throw new Error('Anchor wallet not available');
      }
      
      const program = getProgram(anchorWallet);
      const campaignAccount = await (program.account as any).campaign.fetch(campaignPDA);

      const blockchainCampaign = {
        campaignPDA,
        ...campaignAccount
      } as BlockchainCampaign;

      return convertBlockchainCampaignToUI(blockchainCampaign);
    } catch (err) {
      console.error('Error fetching campaign:', err);
      return null;
    }
  }, [isConnected, publicKey, anchorWallet]);

  useEffect(() => {
    fetchAllCampaigns();
  }, [fetchAllCampaigns]);

  const createCampaign = useCallback(async (params: {
    name: string;
    description: string;
    amountUsdc: number;
    targetLikes: number;
    targetComments: number;
    targetViews: number;
    targetShares: number;
    durationDays: number;
    instagramUsername: string;
  }): Promise<{ success: boolean; campaignId?: string; error?: string; signature?: string }> => {
    if (!isConnected || !publicKey) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      if (!anchorWallet) {
        return { success: false, error: 'Anchor wallet not available' };
      }
      
      const program = getProgram(anchorWallet);
      
      // Calcular deadline (timestamps do Solana)
      const createdAt = Math.floor(Date.now() / 1000);
      const deadlineTs = createdAt + (params.durationDays * 24 * 60 * 60);

      // Converter amount para micro-usdc (6 decimais)
      const amountUsdcBN = new BN(params.amountUsdc * 1_000_000);
      
      // Gerar PDA para a campanha
      const [campaignPDA, bump] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('campaign'),
          publicKey.toBuffer(),
          Buffer.from(new BigInt64Array([BigInt(createdAt)]).buffer),
        ],
        program.programId
      );

      // Chamar a instrução create_campaign
      const signature = await program.methods
        .createCampaign(
          params.name,
          params.description,
          amountUsdcBN,
          new BN(params.targetLikes),
          new BN(params.targetComments),
          new BN(params.targetViews),
          new BN(params.targetShares),
          new BN(deadlineTs),
          params.instagramUsername,
          new BN(createdAt)
        )
        .accounts({
          campaign: campaignPDA,
          influencer: publicKey,
          systemProgram: program.programId,
        })
        .rpc();

      // Recarregar campanhas após criação
      await fetchAllCampaigns();

      return { 
        success: true, 
        campaignId: campaignPDA.toBase58(),
        signature 
      };
    } catch (err) {
      console.error('Error creating campaign:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create campaign'
      };
    }
  }, [isConnected, publicKey, anchorWallet, fetchAllCampaigns]);

  // Função para recarregar campanhas
  const refetch = useCallback(() => {
    fetchAllCampaigns();
  }, [fetchAllCampaigns]);

  return {
    campaigns,
    loading,
    error,
    refetch,
    fetchCampaign,
    createCampaign,
    isConnected,
  };
} 
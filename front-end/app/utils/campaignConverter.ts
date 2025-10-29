import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { Campaign } from '../hooks/useCampaigns';

const USDC_DECIMALS = 6; // USDC has 6 decimals

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

/**
 * Converte um BN de lamports para SOL (com decimais)
 */
function lamportsToSol(lamports: BN): string {
  return (lamports.toNumber() / 1_000_000_000).toFixed(4);
}

/**
 * Converte um BN de USDC para valor legível
 */
function usdcToNumber(usdcAmount: BN): number {
  return usdcAmount.toNumber() / Math.pow(10, USDC_DECIMALS);
}

/**
 * Converte timestamp Unix para data ISO
 */
function timestampToISO(timestamp: BN): string {
  const date = new Date(timestamp.toNumber() * 1000);
  return date.toISOString().split('T')[0];
}

/**
 * Calcula o progresso da campanha em porcentagem
 */
function calculateProgress(current: BN, target: BN): number {
  if (target.eq(new BN(0))) return 0;
  return Math.floor((current.toNumber() / target.toNumber()) * 100);
}

/**
 * Calcula o status da campanha baseado nas métricas e deadline
 */
function calculateCampaignStatus(
  status: BlockchainCampaign['status'],
  currentLikes: BN,
  targetLikes: BN,
  currentViews: BN,
  targetViews: BN,
  deadlineTs: BN,
  amountPaid: BN,
  amountUsdc: BN
): Campaign['status'] {
  const now = new BN(Math.floor(Date.now() / 1000));
  const isExpired = now.gt(deadlineTs);
  const isFunded = amountPaid.gte(amountUsdc);
  const isCompleted = currentLikes.gte(targetLikes) && currentViews.gte(targetViews);

  if (status === 'Cancelled') {
    return 'CANCELLED';
  }

  if (isExpired) {
    return 'EXPIRED';
  }

  if (isCompleted) {
    return 'COMPLETED';
  }

  if (!isFunded) {
    return 'PENDING';
  }

  return 'ACTIVE';
}

/**
 * Converte uma campanha da blockchain para o formato usado na UI
 */
export function convertBlockchainCampaignToUI(
  blockchainCampaign: BlockchainCampaign
): Campaign {
  const amountUsdcValue = usdcToNumber(blockchainCampaign.amountUsdc);
  const amountPaidValue = usdcToNumber(blockchainCampaign.amountPaid);
  
  // Calcular progresso baseado em todas as métricas (média ponderada)
  const likesProgress = calculateProgress(blockchainCampaign.currentLikes, blockchainCampaign.targetLikes);
  const commentsProgress = calculateProgress(blockchainCampaign.currentComments, blockchainCampaign.targetComments);
  const viewsProgress = calculateProgress(blockchainCampaign.currentViews, blockchainCampaign.targetViews);
  const sharesProgress = calculateProgress(blockchainCampaign.currentShares, blockchainCampaign.targetShares);
  
  // Progresso médio de todas as métricas
  const progress = Math.floor((likesProgress + commentsProgress + viewsProgress + sharesProgress) / 4);

  // Calcular status
  const status = calculateCampaignStatus(
    blockchainCampaign.status,
    blockchainCampaign.currentLikes,
    blockchainCampaign.targetLikes,
    blockchainCampaign.currentViews,
    blockchainCampaign.targetViews,
    blockchainCampaign.deadlineTs,
    blockchainCampaign.amountPaid,
    blockchainCampaign.amountUsdc
  );

  return {
    id: blockchainCampaign.campaignPDA.toBase58(),
    brand: blockchainCampaign.brand.toBase58(),
    creator: blockchainCampaign.influencer.toBase58(),
    totalValue: amountUsdcValue.toFixed(1),
    deadline: blockchainCampaign.deadlineTs.toString(),
    targetLikes: blockchainCampaign.targetLikes.toString(),
    targetComments: blockchainCampaign.targetComments.toString(),
    targetViews: blockchainCampaign.targetViews.toString(),
    targetShares: blockchainCampaign.targetShares.toString(),
    currentLikes: blockchainCampaign.currentLikes.toString(),
    currentComments: blockchainCampaign.currentComments.toString(),
    currentViews: blockchainCampaign.currentViews.toString(),
    currentShares: blockchainCampaign.currentShares.toString(),
    paidAmount: amountPaidValue.toFixed(2),
    status,
    progress,
    title: blockchainCampaign.name,
    description: blockchainCampaign.description,
    instagramUsername: blockchainCampaign.instagramUsername,
    createdAt: blockchainCampaign.createdAt.toString(),
    postsCount: blockchainCampaign.posts.length,
    endDate: timestampToISO(blockchainCampaign.deadlineTs),
  };
}

/**
 * Converte múltiplas campanhas da blockchain para o formato usado na UI
 */
export function convertMultipleCampaigns(campaigns: BlockchainCampaign[]): Campaign[] {
  return campaigns.map(convertBlockchainCampaignToUI);
}


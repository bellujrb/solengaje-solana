import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { Campaign } from '../hooks/useCampaigns';

const USDC_DECIMALS = 6; // USDC has 6 decimals

/**
 * Formata um número como moeda em português brasileiro
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

interface BlockchainCampaign {
  campaignPDA: PublicKey;
  influencer: PublicKey;
  brand: PublicKey;
  name: string;
  nickname: string;
  brandName: string;
  hashtag: string;
  amountUsdc: BN;
  paidAmount: BN;
  targetLikes: BN;
  targetComments: BN;
  targetViews: BN;
  targetShares: BN;
  currentLikes: BN;
  currentComments: BN;
  currentViews: BN;
  currentShares: BN;
  deadline: BN;
  status: { draft?: Record<string, unknown> } | { active?: Record<string, unknown> } | { completed?: Record<string, unknown> } | { cancelled?: Record<string, unknown> };
  oracle: PublicKey;
  createdAt: BN;
  lastUpdated: BN;
  paymentMilestones: boolean[];
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
  deadline: BN,
  paidAmount: BN,
  amountUsdc: BN
): Campaign['status'] {
  const now = new BN(Math.floor(Date.now() / 1000));
  const isExpired = now.gt(deadline);
  const isFunded = paidAmount.gte(amountUsdc);
  const isCompleted = currentLikes.gte(targetLikes) && currentViews.gte(targetViews);

  // Check blockchain status first
  if ('cancelled' in status && status.cancelled) {
    return 'CANCELLED';
  }

  if (isExpired) {
    return 'EXPIRED';
  }

  if ('draft' in status && status.draft) {
    return 'DRAFT';
  }

  if (isCompleted || ('completed' in status && status.completed)) {
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
  const amountPaidValue = usdcToNumber(blockchainCampaign.paidAmount);
  
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
    blockchainCampaign.deadline,
    blockchainCampaign.paidAmount,
    blockchainCampaign.amountUsdc
  );

  return {
    id: blockchainCampaign.campaignPDA.toBase58(),
    brand: blockchainCampaign.brand.toBase58(),
    creator: blockchainCampaign.influencer.toBase58(),
    totalValue: formatCurrency(amountUsdcValue),
    deadline: blockchainCampaign.deadline.toString(),
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
    description: blockchainCampaign.hashtag, // hashtag from blockchain
    instagramUsername: blockchainCampaign.nickname || '', // nickname from blockchain as Instagram username
    createdAt: blockchainCampaign.createdAt.toString(),
    postsCount: 0, // Not stored in blockchain
    endDate: timestampToISO(blockchainCampaign.deadline),
  };
}

/**
 * Converte múltiplas campanhas da blockchain para o formato usado na UI
 */
export function convertMultipleCampaigns(campaigns: BlockchainCampaign[]): Campaign[] {
  return campaigns.map(convertBlockchainCampaignToUI);
}


import { useState } from 'react';

interface CreateCampaignParams {
  totalValue: string; // ETH amount as string
  durationDays: string; // Days as string
  targetLikes: string; // Likes as string
  targetViews: string; // Views as string
}

interface CreateCampaignResult {
  success: boolean;
  campaignId?: string;
  error?: string;
  isLoading: boolean;
  isPending: boolean;
  hash?: string;
}

export function useCreateCampaign() {
  const [result, setResult] = useState<CreateCampaignResult>({
    success: false,
    isLoading: false,
    isPending: false,
    hash: undefined,
  });

  const isConnected = true; // Sempre conectado no modo mock
  const hash = undefined;

  const createCampaign = async (params: CreateCampaignParams): Promise<CreateCampaignResult> => {
    try {
      setResult({
        success: false,
        isLoading: true,
        isPending: true,
      });

      // Validate inputs
      const totalValue = parseFloat(params.totalValue);
      const durationDays = parseInt(params.durationDays);
      const targetLikes = parseInt(params.targetLikes);
      const targetViews = parseInt(params.targetViews);

      if (isNaN(totalValue) || totalValue <= 0) {
        throw new Error('Invalid total value');
      }

      if (isNaN(durationDays) || durationDays <= 0 || durationDays > 365) {
        throw new Error('Invalid duration (must be between 1 and 365 days)');
      }

      if (isNaN(targetLikes) || targetLikes <= 0) {
        throw new Error('Invalid target likes');
      }

      if (isNaN(targetViews) || targetViews <= 0) {
        throw new Error('Invalid target views');
      }

      // Simular delay da transação
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Gerar um ID de campanha mockado
      const campaignId = `mock_${Date.now()}`;
      const mockHash = `0x${Math.random().toString(16).substring(2, 66)}`;

      setResult({
        success: true,
        campaignId,
        isLoading: false,
        isPending: false,
        hash: mockHash,
      });

      return {
        success: true,
        campaignId,
        isLoading: false,
        isPending: false,
        hash: mockHash,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setResult({
        success: false,
        error: errorMessage,
        isLoading: false,
        isPending: false,
      });
      return {
        success: false,
        error: errorMessage,
        isLoading: false,
        isPending: false,
        hash: undefined,
      };
    }
  };

  const resetState = () => {
    setResult({
      success: false,
      isLoading: false,
      isPending: false,
      hash: undefined,
    });
  };

  return {
    createCampaign,
    resetState,
    result,
    hash,
    isConnected,
  };
} 
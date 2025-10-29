import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CampaignData } from '../types/campaign';
import { useCampaigns } from '../hooks/useCampaigns';

interface CampaignContextType {
  campaignData: CampaignData;
  updateCampaignBasics: (data: { campaignName: string; brandName: string; description: string; instagramUsername: string }) => void;
  updateSuccessMetrics: (data: { targetLikes: string; targetComments: string; targetViews: string; targetShares: string }) => void;
  updateBudgetTimeline: (data: { totalBudget: string; durationDays: string }) => void;
  resetCampaignData: () => void;
  getCampaignData: () => CampaignData;
  createCampaign: () => Promise<{ success: boolean; error?: string; campaignId?: string; hash?: string; isPending?: boolean }>;
}

const defaultCampaignData: CampaignData = {
  campaignName: '',
  brandName: '',
  description: '',
  instagramUsername: '',
  targetLikes: '',
  targetComments: '',
  targetViews: '',
  targetShares: '',
  totalBudget: '',
  durationDays: '',
};

const CampaignContext = createContext<CampaignContextType | undefined>(undefined);

export function CampaignProvider({ children }: { children: ReactNode }) {
  const [campaignData, setCampaignData] = useState<CampaignData>(defaultCampaignData);
  const { createCampaign: createCampaignHook } = useCampaigns();

  const updateCampaignBasics = (data: { campaignName: string; brandName: string; description: string; instagramUsername: string }) => {
    setCampaignData(prev => ({
      ...prev,
      ...data
    }));
  };

  const updateSuccessMetrics = (data: { targetLikes: string; targetComments: string; targetViews: string; targetShares: string }) => {
    setCampaignData(prev => ({
      ...prev,
      ...data
    }));
  };

  const updateBudgetTimeline = (data: { totalBudget: string; durationDays: string }) => {
    setCampaignData(prev => ({
      ...prev,
      ...data
    }));
  };

  const resetCampaignData = () => {
    setCampaignData(defaultCampaignData);
  };

  const getCampaignData = () => {
    return campaignData;
  };

  const createCampaign = async () => {
    try {
      // Validar dados antes de criar
      const totalBudget = parseFloat(campaignData.totalBudget);
      if (isNaN(totalBudget) || totalBudget <= 0) {
        return {
          success: false,
          error: 'Por favor, informe um orçamento válido.',
        };
      }

      const result = await createCampaignHook({
        name: campaignData.campaignName,
        description: campaignData.description || `${campaignData.brandName} campaign`,
        amountUsdc: totalBudget,
        targetLikes: parseInt(campaignData.targetLikes) || 0,
        targetComments: parseInt(campaignData.targetComments) || 0,
        targetViews: parseInt(campaignData.targetViews) || 0,
        targetShares: parseInt(campaignData.targetShares) || 0,
        durationDays: parseInt(campaignData.durationDays) || 1,
        instagramUsername: campaignData.instagramUsername || campaignData.brandName.toLowerCase().replace(/\s+/g, '_'),
      });
      
      return {
        success: result.success,
        error: result.error,
        campaignId: result.campaignId,
        hash: result.signature,
        isPending: false,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  };

  const value: CampaignContextType = {
    campaignData,
    updateCampaignBasics,
    updateSuccessMetrics,
    updateBudgetTimeline,
    resetCampaignData,
    getCampaignData,
    createCampaign,
  };

  return (
    <CampaignContext.Provider value={value}>
      {children}
    </CampaignContext.Provider>
  );
}

export function useCampaign() {
  const context = useContext(CampaignContext);
  if (context === undefined) {
    throw new Error('useCampaign must be used within a CampaignProvider');
  }
  return context;
} 
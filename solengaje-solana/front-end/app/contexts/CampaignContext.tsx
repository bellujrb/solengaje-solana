import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CampaignData } from '../types/campaign';
import { useCreateCampaign } from '../hooks/useCreateCampaign';

interface CampaignContextType {
  campaignData: CampaignData;
  updateCampaignBasics: (data: { campaignName: string; brandName: string }) => void;
  updateContentRequirements: (data: { selectedContentTypes: string[]; selectedPlatforms: string[] }) => void;
  updateSuccessMetrics: (data: { likes: string; views: string }) => void;
  updateBudgetTimeline: (data: { totalBudget: string; durationDays: string }) => void;
  resetCampaignData: () => void;
  getCampaignData: () => CampaignData;
  createCampaign: () => Promise<{ success: boolean; error?: string; campaignId?: string; hash?: string; isPending?: boolean }>;
}

const defaultCampaignData: CampaignData = {
  campaignName: '',
  brandName: '',
  selectedContentTypes: [],
  selectedPlatforms: [],
  likes: '',
  views: '',
  totalBudget: '',
  durationDays: '',
};

const CampaignContext = createContext<CampaignContextType | undefined>(undefined);

export function CampaignProvider({ children }: { children: ReactNode }) {
  const [campaignData, setCampaignData] = useState<CampaignData>(defaultCampaignData);
  const { createCampaign: createCampaignHook } = useCreateCampaign();

  const updateCampaignBasics = (data: { campaignName: string; brandName: string }) => {
    setCampaignData(prev => ({
      ...prev,
      ...data
    }));
  };

  const updateContentRequirements = (data: { selectedContentTypes: string[]; selectedPlatforms: string[] }) => {
    setCampaignData(prev => ({
      ...prev,
      ...data
    }));
  };

  const updateSuccessMetrics = (data: { likes: string; views: string }) => {
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
      const result = await createCampaignHook({
        totalValue: campaignData.totalBudget,
        durationDays: campaignData.durationDays,
        targetLikes: campaignData.likes,
        targetViews: campaignData.views,
      });
      
      return {
        success: result.success,
        error: result.error,
        campaignId: result.campaignId,
        hash: result.hash,
        isPending: result.isPending,
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
    updateContentRequirements,
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
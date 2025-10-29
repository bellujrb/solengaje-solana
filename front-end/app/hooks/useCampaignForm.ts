import { useCampaign } from '../contexts/CampaignContext';
import { FormProgress, CampaignSaveResult } from '../types/campaign';

export function useCampaignForm() {
  const campaignContext = useCampaign();

  const isFormComplete = () => {
    const { campaignData } = campaignContext;
    return (
      campaignData.campaignName.trim().length > 0 &&
      campaignData.brandName.trim().length > 0 &&
      campaignData.selectedContentTypes.length > 0 &&
      campaignData.selectedPlatforms.length > 0 &&
      campaignData.likes.trim().length > 0 &&
      campaignData.views.trim().length > 0 &&
      campaignData.totalBudget.trim().length > 0 &&
      campaignData.durationDays.trim().length > 0
    );
  };

  const getFormProgress = (): FormProgress => {
    const { campaignData } = campaignContext;
    const totalSteps = 4;
    let completedSteps = 0;

    // Step 1: Campaign Basics
    if (campaignData.campaignName.trim().length > 0 && campaignData.brandName.trim().length > 0) {
      completedSteps++;
    }

    // Step 2: Content Requirements
    if (campaignData.selectedContentTypes.length > 0 && campaignData.selectedPlatforms.length > 0) {
      completedSteps++;
    }

    // Step 3: Success Metrics
    if (campaignData.likes.trim().length > 0 && campaignData.views.trim().length > 0) {
      completedSteps++;
    }

    // Step 4: Budget & Timeline
    if (campaignData.totalBudget.trim().length > 0 && campaignData.durationDays.trim().length > 0) {
      completedSteps++;
    }

    return {
      completedSteps,
      totalSteps,
      percentage: Math.round((completedSteps / totalSteps) * 100)
    };
  };

  const saveCampaign = async (): Promise<CampaignSaveResult> => {
    const { campaignData } = campaignContext;
    
    try {
      // Here you would implement the actual API call to save the campaign
      console.log('Saving campaign:', campaignData);
      
      // Example API call:
      // const response = await fetch('/api/campaigns', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(campaignData),
      // });
      
      // if (!response.ok) {
      //   throw new Error('Failed to save campaign');
      // }
      
      // const result = await response.json();
      // return result;
      
      return { success: true, campaignId: Math.floor(Math.random() * 1000000).toString().padStart(6, '0') };
    } catch (error) {
      console.error('Error saving campaign:', error);
      throw error;
    }
  };

  return {
    ...campaignContext,
    isFormComplete,
    getFormProgress,
    saveCampaign,
  };
} 
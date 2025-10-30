"use client";

import { useState, useEffect } from "react";
import { Button } from "../../../components/button";
import { Card } from "../../../components/card";
import Icon from "../../../components/icon";
import { useCampaigns } from "../../hooks/useCampaigns";
import { useActivateCampaign } from "../../hooks/useActivateCampaign";
import { useRouter } from "next/navigation";
import { PublicKey } from "@solana/web3.js";

type ReviewCampaignProps = {
  campaignId: string;
};

export function ReviewCampaign({ campaignId }: ReviewCampaignProps) {
  const [isActivating, setIsActivating] = useState(false);
  const router = useRouter();
  const { campaigns } = useCampaigns();
  const { activateCampaign } = useActivateCampaign();
  
  // Find the campaign
  const campaign = campaigns.find(c => c.id === campaignId);

  useEffect(() => {
    if (campaignId) {
      console.log("Loading campaign data for ID:", campaignId);
    }
  }, [campaignId]);

  const handleActivateCampaign = async () => {
    if (!campaign) {
      alert('Campanha não encontrada');
      return;
    }

    setIsActivating(true);
    
    try {
      // Parse the campaign ID as a PublicKey (the campaign PDA)
      const campaignPDA = new PublicKey(campaign.id);
      
      // Get the creator and brand public keys from the campaign
      const influencerPublicKey = new PublicKey(campaign.creator);
      const brandPublicKey = new PublicKey(campaign.brand);
      
      const result = await activateCampaign({
        campaignPDA,
        influencerPublicKey,
        brandPublicKey,
      });

      if (result.success) {
        alert('Campanha ativada com sucesso!');
        router.push('/');
      } else {
        alert(`Erro ao ativar campanha: ${result.error}`);
      }
    } catch (error) {
      console.error('Error activating campaign:', error);
      alert(`Erro ao ativar campanha: ${error}`);
    } finally {
      setIsActivating(false);
    }
  };

  if (!campaign) {
    return (
      <div className="flex flex-col min-h-screen font-sans text-[var(--app-foreground)] bg-[var(--app-background)]">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <Icon name="heart" className="mx-auto text-gray-400 mb-4" size="lg" />
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Campanha não encontrada</h2>
            <p className="text-gray-500 text-sm">
              A campanha que você está procurando não existe ou foi removida.
            </p>
            <Button
              variant="ghost"
              className="bg-blue-500 text-white hover:bg-blue-600 mt-4"
              onClick={() => router.push('/')}
            >
              Voltar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-6">
      {/* Page Title */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-black">Review Campaign</h1>
        <p className="text-gray-600">Confirm details before payment</p>
      </div>

      {/* Influencer Card */}
      <Card className="bg-white p-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">{campaign.instagramUsername.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-black">{campaign.instagramUsername}</h3>
            <p className="text-gray-600 text-sm">{campaign.description}</p>
            <div className="flex items-center mt-1">
              <Icon name="check" className="text-green-500 mr-1" size="sm" />
              <span className="text-green-600 text-xs">Verified by Solengaje</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Campaign Details Card */}
      <Card className="bg-white p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Campaign Details</h2>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Status:</span>
            <span className={`px-2 py-1 rounded text-sm font-medium ${
              campaign.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-700' :
              campaign.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {campaign.status}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">End Date:</span>
            <span className="font-medium">{campaign.endDate}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Target Views:</span>
            <span className="font-medium">{campaign.targetViews}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Target Likes:</span>
            <span className="font-medium">{campaign.targetLikes}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Target Comments:</span>
            <span className="font-medium">{campaign.targetComments}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Target Shares:</span>
            <span className="font-medium">{campaign.targetShares}</span>
          </div>
        </div>

        <div className="border-t border-gray-200 my-4"></div>

        <div className="flex justify-between items-center">
          <span className="font-bold text-gray-800">Total Value:</span>
          <span className="font-bold text-green-600 text-2xl">${campaign.totalValue}</span>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button
          onClick={handleActivateCampaign}
          disabled={isActivating}
          className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-medium flex items-center justify-center"
        >
          {isActivating ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Ativando...
            </>
          ) : (
            <>
              <Icon name="star" className="mr-2" size="sm" />
              Ativar Campanha (USDC)
            </>
          )}
        </Button>
        <Button
          onClick={() => router.push('/')}
          variant="ghost"
          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-lg font-medium"
        >
          Voltar
        </Button>
      </div>
    </div>
  );
}
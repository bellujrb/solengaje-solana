"use client";

import { useState, useEffect } from "react";
import { Button } from "../../../components/button";
import { Card } from "../../../components/card";
import Icon from "../../../components/icon";
import { ConnectButton } from '../ConnectButton';
import { useAuth } from "../../hooks/useAuth";
import { CompanyDataForm } from "./company-data_forms";
import { PixPaymentScreen } from "./pix-payment";

type ReviewCampaignProps = {
  campaignId?: string;
};

type CompanyData = {
  companyName: string;
  cnpj: string;
  email: string;
  responsibleName: string;
};

export function ReviewCampaign({ campaignId }: ReviewCampaignProps) {
  const [isConnecting] = useState(false);
  const [currentStep, setCurrentStep] = useState<'review' | 'company-data' | 'pix-payment'>('review');
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const { isConnected } = useAuth();
  const [campaignData] = useState({
    name: "Summer Beach Collection",
    influencer: {
      handle: "@cristinaprado",
      followers: "125K",
      avatar: "CP",
      verified: true
    },
    details: {
      time: "14 days",
      contents: "Video, Photo",
      platforms: "Instagram, TikTok"
    },
    kpis: {
      views: "50.000",
      likes: "5",
    },
    totalValue: "$5.000"
  });

  useEffect(() => {
    if (campaignId) {
      console.log("Loading campaign data for ID:", campaignId);
    }
  }, [campaignId]);

  // const handleConnectWallet = async () => {
  //   setIsConnecting(true);
  //   try {
  //     console.log("Connecting wallet...");
  //     await new Promise(resolve => setTimeout(resolve, 2000));
  //   } catch (error) {
  //     console.error("Failed to connect wallet:", error);
  //   } finally {
  //     setIsConnecting(false);
  //   }
  // };

  const handleContinue = () => {
    setCurrentStep('company-data');
  };

  const handleBack = () => {
    setCurrentStep('review');
  };

  const handlePay = (companyData: CompanyData) => {
    console.log("Processing payment with company data:", companyData);
    setCompanyData(companyData);
    setCurrentStep('pix-payment');
  };

  const handleBackFromPix = () => {
    setCurrentStep('company-data');
  };

  const handleConfirmPayment = () => {
    console.log("Payment confirmed!");
    // Here you would implement the final payment confirmation logic
  };

  if (currentStep === 'company-data') {
    return (
      <CompanyDataForm
        campaignId={campaignId}
        onBack={handleBack}
        onPay={handlePay}
      />
    );
  }

  if (currentStep === 'pix-payment' && companyData) {
    return (
      <PixPaymentScreen
        campaignId={campaignId}
        onBack={handleBackFromPix}
        onConfirmPayment={handleConfirmPayment}
        amount={campaignData.totalValue}
        campaignName={campaignData.name}
        companyData={{
          companyName: companyData.companyName,
          cnpj: companyData.cnpj
        }}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-screen font-sans text-[var(--app-foreground)] bg-[var(--app-background)]">
      {/* Header with Wallet */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <Icon name="lightning" className="text-white mr-2" size="md" />
            <span className="text-white font-bold text-xl">Solengaje</span>
          </div>
          <ConnectButton />
        </div>
        <div className="text-center">
          <h2 className="text-white text-lg font-medium mb-2">Campaign: {campaignData.name}</h2>
          <p className="text-white text-sm opacity-90">Secure payment via Morph Holesky blockchain</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 py-6">
        <div className="max-w-md mx-auto space-y-6">
          {/* Page Title */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-black">Review Campaign</h1>
            <p className="text-gray-500 text-base">Confirm details before payment</p>
          </div>

          {/* Influencer Card */}
          <Card className="bg-white p-6 shadow-lg rounded-xl">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-purple-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">{campaignData.influencer.avatar}</span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-black text-lg">{campaignData.influencer.handle}</h3>
                <p className="text-gray-500 text-base mb-2">{campaignData.influencer.followers} followers</p>
                {campaignData.influencer.verified && (
                  <div className="flex items-center">
                    <Icon name="check" className="text-green-500 mr-2" size="sm" />
                    <span className="text-green-600 text-sm font-medium">Verified by Solengaje</span>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Campaign Details Card */}
          <Card className="bg-white p-6 shadow-lg rounded-xl">
            <h3 className="font-bold text-black text-lg mb-6">Campaign Details</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-base">Time:</span>
                <span className="font-bold text-black text-base">{campaignData.details.time}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-base">Contents:</span>
                <span className="font-bold text-black text-base">{campaignData.details.contents}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-base">Platforms:</span>
                <span className="font-bold text-black text-base">{campaignData.details.platforms}</span>
              </div>
            </div>

            <div className="border-t border-gray-200 my-6"></div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-base">Views:</span>
                <span className="font-bold text-black text-base">{campaignData.kpis.views}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-base">Likes:</span>
                <span className="font-bold text-black text-base">{campaignData.kpis.likes}</span>
              </div>
            </div>

            <div className="border-t border-gray-200 my-6"></div>

            <div className="flex justify-between items-center">
              <span className="font-bold text-black text-lg">Value Total:</span>
              <span className="font-bold text-green-500 text-2xl">{campaignData.totalValue}</span>
            </div>
          </Card>
        </div>
      </div>

      {/* Payment Button - Fixed at bottom */}
      <div className="px-6 py-6 bg-white border-t border-gray-100">
        <div className="max-w-md mx-auto">
          <Button
            onClick={handleContinue}
            disabled={isConnecting}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center shadow-lg"
          >
            {isConnecting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Processando...
              </>
            ) : (
              <>
                <Icon name="arrow-right" className="mr-3" size="md" />
                Continuar
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
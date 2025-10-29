import { useState, useEffect } from "react";
import { Button } from "../../../components/button";
import { Card } from "../../../components/card";
import Icon from "../../../components/icon";
import { useCampaign } from "../../contexts/CampaignContext";

type CampaignBasicsScreenProps = {
  setActiveTab: (tab: string) => void;
};

export function CampaignBasicsScreen({ setActiveTab }: CampaignBasicsScreenProps) {
  const { campaignData, updateCampaignBasics } = useCampaign();
  const [campaignName, setCampaignName] = useState(campaignData.campaignName);
  const [brandName, setBrandName] = useState(campaignData.brandName);

  // Sync local state with context when context changes
  useEffect(() => {
    setCampaignName(campaignData.campaignName);
    setBrandName(campaignData.brandName);
  }, [campaignData.campaignName, campaignData.brandName]);

  const handleBackToDashboard = () => {
    setActiveTab("dashboard");
  };

  const handleContinue = () => {
    updateCampaignBasics({ campaignName, brandName });
    setActiveTab("content-requirements");
  };

  const isFormValid = campaignName.trim().length > 0 && brandName.trim().length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <button
          onClick={handleBackToDashboard}
          className="text-blue-500 hover:text-blue-600 font-medium"
        >
          ← Back to dashboard
        </button>
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
          <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-black">Campaign Basics</h1>
        <p className="text-gray-600">Essential information about your campaign</p>
      </div>

      {/* Form Card */}
      <Card className="bg-white p-6 space-y-6">
        {/* Campaign Name Field */}
        <div className="space-y-2">
          <label htmlFor="campaignName" className="block text-sm font-medium text-gray-700">
            Campaign Name *
          </label>
          <input
            id="campaignName"
            type="text"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            placeholder="Beach collection 2026"
            maxLength={50}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
          />
          <div className="text-right text-sm text-gray-500">
            {campaignName.length}/50
          </div>
        </div>

        {/* Brand Name Field */}
        <div className="space-y-2">
          <label htmlFor="brandName" className="block text-sm font-medium text-gray-700">
            Brand Name *
          </label>
          <input
            id="brandName"
            type="text"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="Converse LA"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
          />
        </div>
      </Card>

      {/* Continue Button */}
      <Button
        onClick={handleContinue}
        disabled={!isFormValid}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        Continue
        <Icon name="arrow-right" className="ml-2" />
      </Button>
    </div>
  );
} 
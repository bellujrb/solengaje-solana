import { useState, useEffect } from "react";
import { Button } from "../../../components/button";
import { Card } from "../../../components/card";
import Icon from "../../../components/icon";
import { useCampaign } from "../../contexts/CampaignContext";

type SuccessMetricsScreenProps = {
  setActiveTab: (tab: string) => void;
};

export function SuccessMetricsScreen({ setActiveTab }: SuccessMetricsScreenProps) {
  const { campaignData, updateSuccessMetrics } = useCampaign();
  const [likes, setLikes] = useState(campaignData.likes || "");
  const [views, setViews] = useState(campaignData.views || "");

  // Sync local state with context when context changes
  useEffect(() => {
    setLikes(campaignData.likes || "");
    setViews(campaignData.views || "");
  }, [campaignData.likes, campaignData.views]);

  const handleBackToDashboard = () => {
    setActiveTab("dashboard");
  };

  const handleContinue = () => {
    updateSuccessMetrics({
      likes,
      views
    });
    setActiveTab("budget-timeline");
  };

  const isFormValid = likes.trim().length > 0 && views.trim().length > 0;

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
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-black">Success Metrics</h1>
        <p className="text-gray-600">Set your campaign targets</p>
      </div>

      {/* Metrics Section */}
      <Card className="bg-white p-6 space-y-6">
        <div className="space-y-4">
          {/* Views Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Views Target *</label>
            <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg">
              <Icon name="star" className="text-blue-600" />
              <input
                type="number"
                value={views}
                onChange={(e) => setViews(e.target.value)}
                placeholder="100000"
                className="flex-1 border-none outline-none text-lg"
              />
            </div>
          </div>

          {/* Likes Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Likes Target *</label>
            <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg">
              <Icon name="heart" className="text-red-600" />
              <input
                type="number"
                value={likes}
                onChange={(e) => setLikes(e.target.value)}
                placeholder="5000"
                className="flex-1 border-none outline-none text-lg"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex space-x-3">
        <Button
          onClick={handleBackToDashboard}
          variant="outline"
          className="flex-1 bg-white border-gray-300 text-gray-700 hover:bg-gray-50 py-3 rounded-lg font-medium"
        >
          <Icon name="arrow-right" className="mr-2 rotate-180" />
          Back
        </Button>
        <Button
          onClick={handleContinue}
          disabled={!isFormValid}
          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Continue
          <Icon name="arrow-right" className="ml-2" />
        </Button>
      </div>
    </div>
  );
} 
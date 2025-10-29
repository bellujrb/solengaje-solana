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
  const [targetLikes, setTargetLikes] = useState(campaignData.targetLikes || "");
  const [targetComments, setTargetComments] = useState(campaignData.targetComments || "");
  const [targetViews, setTargetViews] = useState(campaignData.targetViews || "");
  const [targetShares, setTargetShares] = useState(campaignData.targetShares || "");

  // Sync local state with context when context changes
  useEffect(() => {
    setTargetLikes(campaignData.targetLikes || "");
    setTargetComments(campaignData.targetComments || "");
    setTargetViews(campaignData.targetViews || "");
    setTargetShares(campaignData.targetShares || "");
  }, [campaignData.targetLikes, campaignData.targetComments, campaignData.targetViews, campaignData.targetShares]);

  const handleBackToDashboard = () => {
    setActiveTab("dashboard");
  };

  const handleContinue = () => {
    updateSuccessMetrics({
      targetLikes,
      targetComments,
      targetViews,
      targetShares
    });
    setActiveTab("budget-timeline");
  };

  const isFormValid = targetLikes.trim().length > 0 && targetComments.trim().length > 0 && targetViews.trim().length > 0 && targetShares.trim().length > 0;

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
      <Card className="bg-white p-6 space-y-4">
        <div className="space-y-3">
          {/* Views Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Views Target *</label>
            <input
              type="number"
              value={targetViews}
              onChange={(e) => setTargetViews(e.target.value)}
              placeholder="100000"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Likes Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Likes Target *</label>
            <input
              type="number"
              value={targetLikes}
              onChange={(e) => setTargetLikes(e.target.value)}
              placeholder="5000"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Comments Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Comments Target *</label>
            <input
              type="number"
              value={targetComments}
              onChange={(e) => setTargetComments(e.target.value)}
              placeholder="1000"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Shares Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Shares Target *</label>
            <input
              type="number"
              value={targetShares}
              onChange={(e) => setTargetShares(e.target.value)}
              placeholder="500"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
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
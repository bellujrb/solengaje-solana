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
  const [description, setDescription] = useState(campaignData.description);
  const [instagramUsername, setInstagramUsername] = useState(campaignData.instagramUsername);
  const [hashtagInput, setHashtagInput] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);

  // Sync local state with context when context changes
  useEffect(() => {
    setCampaignName(campaignData.campaignName);
    setBrandName(campaignData.brandName);
    setDescription(campaignData.description);
    setInstagramUsername(campaignData.instagramUsername);
  }, [campaignData.campaignName, campaignData.brandName, campaignData.description, campaignData.instagramUsername]);

  const handleBackToDashboard = () => {
    setActiveTab("dashboard");
  };

  const handleContinue = () => {
    updateCampaignBasics({ campaignName, brandName, description, instagramUsername });
    setActiveTab("success-metrics");
  };

  const addHashtag = () => {
    const trimmedHashtag = hashtagInput.trim();
    if (trimmedHashtag && !hashtags.includes(trimmedHashtag)) {
      setHashtags([...hashtags, trimmedHashtag]);
      setHashtagInput("");
    }
  };

  const removeHashtag = (hashtagToRemove: string) => {
    setHashtags(hashtags.filter(h => h !== hashtagToRemove));
  };

  const handleHashtagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addHashtag();
    }
  };

  const isFormValid = campaignName.trim().length > 0 && brandName.trim().length > 0 && description.trim().length > 0 && instagramUsername.trim().length > 0;

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
            maxLength={100}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
          />
          <div className="text-right text-sm text-gray-500">
            {campaignName.length}/100
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

        {/* Description Field */}
        <div className="space-y-2">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description *
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter campaign description..."
            rows={3}
            maxLength={500}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors resize-none"
          />
          <div className="text-right text-sm text-gray-500">
            {description.length}/500
          </div>
        </div>

        {/* Instagram Username Field */}
        <div className="space-y-2">
          <label htmlFor="instagramUsername" className="block text-sm font-medium text-gray-700">
            Instagram Username *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500">@</span>
            </div>
            <input
              id="instagramUsername"
              type="text"
              value={instagramUsername}
              onChange={(e) => setInstagramUsername(e.target.value)}
              placeholder="brandname"
            maxLength={50}
              className="w-full pl-7 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
            />
          </div>
        </div>

        {/* Hashtags Field */}
        <div className="space-y-2">
          <label htmlFor="hashtags" className="block text-sm font-medium text-gray-700">
            Hashtags (Optional)
          </label>
          <div className="flex flex-wrap gap-2 min-h-[3rem] p-3 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent bg-white">
            {hashtags.map((hashtag) => (
              <span
                key={hashtag}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
              >
                #{hashtag}
                <button
                  type="button"
                  onClick={() => removeHashtag(hashtag)}
                  className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200 focus:outline-none"
                >
                  ×
                </button>
              </span>
            ))}
            <input
              type="text"
              value={hashtagInput}
              onChange={(e) => setHashtagInput(e.target.value)}
              onKeyPress={handleHashtagKeyPress}
              placeholder={hashtags.length === 0 ? "Add hashtags..." : ""}
              className="flex-1 min-w-[150px] border-none outline-none text-sm"
            />
          </div>
          <p className="text-xs text-gray-500">
            Press Enter or comma to add hashtags
          </p>
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
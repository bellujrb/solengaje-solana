import { useState, useEffect } from "react";
import { Button } from "../../../components/button";
import { Card } from "../../../components/card";
import Icon from "../../../components/icon"; 
import { useCampaign } from "../../contexts/CampaignContext";
import { ContentType, Platform } from "../../types/campaign";

type ContentRequirementsScreenProps = {
  setActiveTab: (tab: string) => void;
};

export function ContentRequirementsScreen({ setActiveTab }: ContentRequirementsScreenProps) {
  const { campaignData, updateContentRequirements } = useCampaign();
  const [selectedContentTypes, setSelectedContentTypes] = useState<string[]>(campaignData.selectedContentTypes.length > 0 ? campaignData.selectedContentTypes : ["video", "stories"]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(campaignData.selectedPlatforms.length > 0 ? campaignData.selectedPlatforms : ["instagram"]);

  // Sync local state with context when context changes
  useEffect(() => {
    if (campaignData.selectedContentTypes.length > 0) {
      setSelectedContentTypes(campaignData.selectedContentTypes);
    }
    if (campaignData.selectedPlatforms.length > 0) {
      setSelectedPlatforms(campaignData.selectedPlatforms);
    }
  }, [campaignData.selectedContentTypes, campaignData.selectedPlatforms]);

  const contentTypes: ContentType[] = [
    {
      id: "video",
      name: "Video",
      description: "Reels, Shorts",
      icon: "star"
    },
    {
      id: "photo",
      name: "Photo",
      description: "Feed posts, carousels",
      icon: "camera"
    },
    {
      id: "stories",
      name: "Stories",
      description: "Temporary content",
      icon: "check"
    },
    {
      id: "live",
      name: "Live",
      description: "Live broadcasts",
      icon: "plus"
    }
  ];

  const platforms: Platform[] = [
    {
      id: "instagram",
      name: "Instagram",
      icon: "camera"
    },
    {
      id: "x",
      name: "X",
      icon: "star"
    }
  ];

  const handleBackToDashboard = () => {
    setActiveTab("dashboard");
  };

  const handleContinue = () => {
    updateContentRequirements({ selectedContentTypes, selectedPlatforms });
    setActiveTab("success-metrics");
  };

  const toggleContentType = (contentTypeId: string) => {
    setSelectedContentTypes(prev => 
      prev.includes(contentTypeId)
        ? prev.filter(id => id !== contentTypeId)
        : [...prev, contentTypeId]
    );
  };

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId)
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    );
  };

  const isFormValid = selectedContentTypes.length > 0 && selectedPlatforms.length > 0;
  
  console.log("Form validation:", {
    selectedContentTypes,
    selectedPlatforms,
    isFormValid
  });

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
          <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-black">Content Requirements</h1>
        <p className="text-gray-600">Define content types, platforms, and specifications</p>
      </div>

      {/* Content Types Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-black">Content Types</h2>
        <div className="grid grid-cols-2 gap-3">
          {contentTypes.map((contentType) => (
            <Card
              key={contentType.id}
              className={`p-4 cursor-pointer transition-all ${
                selectedContentTypes.includes(contentType.id)
                  ? "border-2 border-blue-500 bg-blue-50"
                  : "border border-gray-200 bg-white hover:border-gray-300"
              }`}
              onClick={() => toggleContentType(contentType.id)}
            >
              <div className="text-center space-y-2">
                <div className="w-8 h-8 mx-auto bg-gray-200 rounded-lg flex items-center justify-center">
                  <Icon name={contentType.icon} className="text-gray-600" size="sm" />
                </div>
                <div>
                  <p className="font-medium text-black">{contentType.name}</p>
                  <p className="text-xs text-gray-500">{contentType.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Target Platforms Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-black">Target Platforms</h2>
        <div className="grid grid-cols-2 gap-3">
          {platforms.map((platform) => (
            <Card
              key={platform.id}
              className={`p-4 cursor-pointer transition-all ${
                selectedPlatforms.includes(platform.id)
                  ? "border-2 border-purple-500 bg-purple-50"
                  : "border border-gray-200 bg-white hover:border-gray-300"
              }`}
              onClick={() => togglePlatform(platform.id)}
            >
              <div className="text-center space-y-2">
                <div className="w-8 h-8 mx-auto bg-gray-200 rounded-lg flex items-center justify-center">
                  <Icon name={platform.icon} className="text-gray-600" size="sm" />
                </div>
                <div>
                  <p className="font-medium text-black">{platform.name}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

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
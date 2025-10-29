import { Button } from "../../../components/button";
import { Card } from "../../../components/card";
import Icon from "../../../components/icon";
import { useAuth } from "../../hooks/useAuth";
import { ConnectButton } from '../ConnectButton';
import { useCampaigns } from "../../hooks/useCampaigns";

type CampaignDetailsScreenProps = {
  setActiveTab: (tab: string) => void;
  campaignId?: string;
};

export function CampaignDetailsScreen({ setActiveTab, campaignId }: CampaignDetailsScreenProps) {
  const { isConnected } = useAuth();
  const { campaigns } = useCampaigns();
  
  // Encontrar a campanha pelo ID
  const campaign = campaigns.find(c => c.id === campaignId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-50 text-green-600 border-green-300";
      case "COMPLETED":
        return "bg-blue-50 text-blue-600 border-blue-300";
      case "PENDING":
        return "bg-yellow-50 text-yellow-600 border-yellow-300";
      case "EXPIRED":
        return "bg-red-50 text-red-600 border-red-300";
      case "CANCELLED":
        return "bg-gray-50 text-gray-600 border-gray-300";
      default:
        return "bg-gray-50 text-gray-600 border-gray-300";
    }
  };

  if (!isConnected) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-black">Campaign Details</h1>
          <p className="text-gray-600">Connect your wallet to view campaign details</p>
        </div>

        <Card className="bg-white p-6 space-y-4">
          <div className="text-center space-y-4">
            <Icon name="heart" className="mx-auto text-gray-400" size="lg" />
            <h2 className="text-lg font-semibold text-gray-700">Connect Wallet Required</h2>
            <p className="text-gray-500 text-sm">
              You need to connect your wallet to access campaign details
            </p>
            <ConnectButton />
          </div>
        </Card>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="space-y-6 animate-fade-in">
        <button
          onClick={() => setActiveTab("campaigns")}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
        >
          <Icon name="arrow-right" size="sm" className="rotate-180" />
          <span className="text-sm">Back to campaigns</span>
        </button>

        <Card className="bg-white p-6 text-center space-y-4">
          <Icon name="heart" className="mx-auto text-gray-400" size="lg" />
          <h2 className="text-lg font-semibold text-gray-700">Campaign Not Found</h2>
          <p className="text-gray-500 text-sm">
            The campaign you're looking for doesn't exist or has been removed.
          </p>
          <Button
            variant="ghost"
            className="bg-blue-500 text-white hover:bg-blue-600"
            onClick={() => setActiveTab("campaigns")}
          >
            Back to Campaigns
          </Button>
        </Card>
      </div>
    );
  }

  const daysRemaining = Math.ceil((new Date(campaign.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="space-y-4 animate-fade-in pb-6">
      {/* Header com Back e Status */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setActiveTab("campaigns")}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <Icon name="arrow-right" size="sm" className="rotate-180" />
          <span className="text-sm">Back to campaigns</span>
        </button>
        
        <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border-2 ${getStatusColor(campaign.status)}`}>
          <Icon name="star" size="sm" />
          <span className="text-sm font-bold">{campaign.status}</span>
        </div>
      </div>

      {/* Campaign Overview Card */}
      <Card className="bg-white p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-3">{campaign.title}</h1>
        
        <div className="flex items-center space-x-2 text-gray-600 mb-4">
          <Icon name="star" size="sm" />
          <span className="text-sm">Ends: {campaign.endDate}</span>
        </div>

        <Button
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-medium"
        >
          Update Campaign
        </Button>
      </Card>

      {/* Campaign Progress Card */}
      <Card className="bg-white p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Campaign Progress</h2>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div
            className="bg-green-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${campaign.progress}%` }}
          ></div>
        </div>

        {/* Metrics Cards */}
        <div className="space-y-3">
          {/* Total Value Card */}
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-3xl font-bold text-green-600">${campaign.totalValue}</p>
            <p className="text-sm font-medium text-gray-700 mt-1">Total Value</p>
            <p className="text-xs text-gray-500">Campaign budget</p>
          </div>

          {/* Target Views Card */}
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-3xl font-bold text-blue-600">{campaign.targetViews}</p>
            <p className="text-sm font-medium text-gray-700 mt-1">Target views</p>
            <p className="text-xs text-gray-500">Goal to reach</p>
          </div>

          {/* Days Remaining Card */}
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-3xl font-bold text-purple-600">{daysRemaining > 0 ? daysRemaining : 0}</p>
            <p className="text-sm font-medium text-purple-700 mt-1">Days Remaining</p>
            <p className="text-xs text-gray-500">Time left</p>
          </div>
        </div>
      </Card>
    </div>
  );
}


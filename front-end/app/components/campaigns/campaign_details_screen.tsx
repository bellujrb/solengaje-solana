import { Button } from "../../../components/button";
import { Card } from "../../../components/card";
import Icon from "../../../components/icon";
import { useAuth } from "../../hooks/useAuth";
import { ConnectButton } from '../ConnectButton';
import { useCampaigns } from "../../hooks/useCampaigns";
import { useActivateCampaign } from "../../hooks/useActivateCampaign";
import { useRouter } from "next/navigation";

type CampaignDetailsScreenProps = {
  setActiveTab: (tab: string) => void;
  campaignId?: string;
};

export function CampaignDetailsScreen({ setActiveTab, campaignId }: CampaignDetailsScreenProps) {
  const { isConnected } = useAuth();
  const { campaigns } = useCampaigns();
  const { loading: activating } = useActivateCampaign();
  const router = useRouter();
  
  // Encontrar a campanha pelo ID
  const campaign = campaigns.find(c => c.id === campaignId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-50 text-green-600 border-green-300";
      case "COMPLETED":
        return "bg-blue-50 text-blue-600 border-blue-300";
      case "PENDING":
      case "DRAFT":
        return "bg-yellow-50 text-yellow-600 border-yellow-300";
      case "EXPIRED":
        return "bg-red-50 text-red-600 border-red-300";
      case "CANCELLED":
        return "bg-gray-50 text-gray-600 border-gray-300";
      default:
        return "bg-gray-50 text-gray-600 border-gray-300";
    }
  };

  const handleCopyActivationLink = async () => {
    if (!campaign) return;

    const activationLink = `${window.location.origin}/campaign-pay/${campaign.id}`;
    
    try {
      await navigator.clipboard.writeText(activationLink);
      alert('Link de ativação copiado!');
    } catch (err) {
      console.error('Erro ao copiar link:', err);
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
            <div className="flex justify-center">
              <ConnectButton />
            </div>
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
            The campaign you&apos;re looking for doesn&apos;t exist or has been removed.
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
        
        <p className="text-gray-600 mb-3">{campaign.description}</p>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center space-x-2 text-gray-600">
            <Icon name="star" size="sm" />
            <span className="text-sm">Instagram: @{campaign.instagramUsername}</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-600">
            <Icon name="star" size="sm" />
            <span className="text-sm">Created: {campaign.createdAt ? new Date(parseInt(campaign.createdAt) * 1000).toLocaleDateString() : 'N/A'}</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-600">
            <Icon name="star" size="sm" />
            <span className="text-sm">Ends: {campaign.endDate}</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-600">
            <Icon name="camera" size="sm" />
            <span className="text-sm">Posts: {campaign.postsCount}</span>
          </div>
        </div>

        {campaign.status === 'PENDING' || campaign.status === 'DRAFT' ? (
          <div className="space-y-2">
            <Button
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-medium"
              onClick={handleCopyActivationLink}
            >
              Copiar Link de Ativação
            </Button>
          </div>
        ) : campaign.status === 'ACTIVE' ? (
          <Button
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-medium"
          >
            Update Campaign Metrics
          </Button>
        ) : null}
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

        {/* Metrics Cards - Grid 2x2 */}
        <div className="grid grid-cols-2 gap-3">
          {/* Total Value Card */}
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-3xl font-bold text-green-600">${campaign.totalValue}</p>
            <p className="text-sm font-medium text-gray-700 mt-1">Total Value</p>
            <p className="text-xs text-gray-500">Budget</p>
          </div>

          {/* Paid Amount Card */}
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-3xl font-bold text-green-600">${campaign.paidAmount}</p>
            <p className="text-sm font-medium text-gray-700 mt-1">Paid</p>
            <p className="text-xs text-gray-500">Amount paid</p>
          </div>

          {/* Current vs Target Views */}
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-2xl font-bold text-purple-600">{campaign.currentViews}/{campaign.targetViews}</p>
            <p className="text-sm font-medium text-gray-700 mt-1">Views</p>
            <p className="text-xs text-gray-500">Current / Target</p>
          </div>

          {/* Current vs Target Likes */}
          <div className="bg-pink-50 rounded-lg p-4">
            <p className="text-2xl font-bold text-pink-600">{campaign.currentLikes}/{campaign.targetLikes}</p>
            <p className="text-sm font-medium text-gray-700 mt-1">Likes</p>
            <p className="text-xs text-gray-500">Current / Target</p>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-lg font-bold text-gray-700">{campaign.currentComments}/{campaign.targetComments}</p>
            <p className="text-xs text-gray-600">Comments</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-lg font-bold text-gray-700">{campaign.currentShares}/{campaign.targetShares}</p>
            <p className="text-xs text-gray-600">Shares</p>
          </div>
        </div>
      </Card>
    </div>
  );
}


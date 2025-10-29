import { useState, useEffect } from "react";
import { Button } from "../../../components/button";
import { Card } from "../../../components/card";
import Icon from "../../../components/icon";
import { useCampaign } from "../../contexts/CampaignContext";

type CampaignSuccessScreenProps = {
  setActiveTab: (tab: string) => void;
};

export function CampaignSuccessScreen({ setActiveTab }: CampaignSuccessScreenProps) {
  const { campaignData, resetCampaignData } = useCampaign();
  const [copied, setCopied] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  // Função para formatar números em formato K
  const formatNumber = (value: string | number): string => {
    const num = typeof value === 'string' ? parseInt(value) || 0 : value;
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num.toString();
  };

  // Função para formatar ETH
  const formatETH = (value: string): string => {
    if (!value || value === '0') return '0';
    
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return '0';
    
    return numericValue.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4
    });
  };
  
  // Generate campaign link
  const campaignLink = transactionHash 
    ? `http://solengaje.vercel.app/campaign-pay/${transactionHash.slice(0, 10)}`
    : `http://solengaje.vercel.app/campaign-pay/new`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(campaignLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleBackToDashboard = () => {
    resetCampaignData(); // Reset campaign data when going back to dashboard
    setActiveTab("dashboard");
  };

  // Log campaign data and get transaction hash when component mounts
  useEffect(() => {
    console.log("Campaign created successfully:", campaignData);
    
    // Get transaction hash from localStorage
    const hash = localStorage.getItem('campaignTransactionHash');
    if (hash) {
      setTransactionHash(hash);
      // Clear from localStorage after reading
      localStorage.removeItem('campaignTransactionHash');
    }
  }, [campaignData]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Success Header */}
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
          <Icon name="check" className="text-green-600" size="lg" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-black">Campaign Created!</h1>
          <p className="text-gray-600">Your campaign is ready to be shared with brands</p>
        </div>
      </div>

      {/* Campaign Summary Card */}
      <Card className="bg-white p-6 space-y-4">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
        >
          <h2 className="text-lg font-bold text-black">Campaign Summary</h2>
          <Icon 
            name="arrow-right" 
            className={`transition-transform duration-200 ${
              isSummaryExpanded ? 'rotate-90' : ''
            }`} 
          />
        </div>
        
        {isSummaryExpanded && (
          <div className="space-y-3 pt-2 border-t border-gray-200">
            <div className="flex justify-between">
              <span className="text-gray-600">Campaign Name:</span>
              <span className="font-medium">{campaignData.campaignName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Brand:</span>
              <span className="font-medium">{campaignData.brandName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Budget:</span>
              <span className="font-medium">{formatETH(campaignData.totalBudget)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Duration:</span>
              <span className="font-medium">{campaignData.durationDays} days</span>
            </div>
            {/* Success Metrics */}
            <div className="pt-2 border-t border-gray-200">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600 font-medium">Success Metrics:</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Views Target:</span>
                <span className="font-medium">{formatNumber(campaignData.targetViews || '0')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Likes Target:</span>
                <span className="font-medium">{formatNumber(campaignData.targetLikes || '0')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Comments Target:</span>
                <span className="font-medium">{formatNumber(campaignData.targetComments || '0')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shares Target:</span>
                <span className="font-medium">{formatNumber(campaignData.targetShares || '0')}</span>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Campaign Link Card */}
      <Card className="bg-white p-6 space-y-4">
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-black">Campaign Link</h2>
          <p className="text-sm text-gray-600">
            Share this link with brands to start receiving applications
          </p>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex-1">
              <p className="font-mono text-sm text-gray-800 break-all">
                {campaignLink}
              </p>
            </div>
            <Button
              onClick={handleCopyLink}
              variant="ghost"
              size="sm"
              className={`px-3 py-1 text-sm font-medium transition-colors ${
                copied 
                  ? "bg-green-100 text-green-700 hover:bg-green-200" 
                  : "bg-blue-100 text-blue-700 hover:bg-blue-200"
              }`}
            >
              {copied ? (
                <>
                  <Icon name="check" className="mr-1" size="sm" />
                  Copied!
                </>
              ) : (
                <>
                  <Icon name="star" className="mr-1" size="sm" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Process Information */}
      <Card className="bg-blue-50 p-6 space-y-4">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
            <Icon name="lightning" className="text-blue-600" size="sm" />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-black">Next Steps</h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              The campaign will only be finalized when a brand completes their registration 
              and makes the payment to the campaign pool. You&apos;ll be notified once the 
              campaign is fully funded and ready to start.
            </p>
          </div>
        </div>
      </Card>

      {/* Blockchain Transaction Info */}
      {transactionHash && (
        <Card className="bg-green-50 p-6 space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <Icon name="check" className="text-green-600" size="sm" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-black">Blockchain Transaction</h3>
              <p className="text-sm text-gray-700">
                Your campaign has been successfully created on the blockchain!
              </p>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">Transaction Hash:</span>
                <code className="text-xs bg-white px-2 py-1 rounded border">
                  {transactionHash.slice(0, 10)}...{transactionHash.slice(-8)}
                </code>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(transactionHash);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  variant="ghost"
                  size="sm"
                  className="px-2 py-1 text-xs"
                >
                  Copy
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Campaign Status */}
      <Card className="bg-gray-50 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-black">Campaign Status</h3>
            <p className="text-sm text-gray-600">
              {transactionHash ? 'Campaign created on blockchain' : 'Waiting for brand registration'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full animate-pulse ${
              transactionHash ? 'bg-green-400' : 'bg-yellow-400'
            }`}></div>
            <span className={`text-sm font-medium ${
              transactionHash ? 'text-green-700' : 'text-yellow-700'
            }`}>
              {transactionHash ? 'Created' : 'Pending'}
            </span>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button
          onClick={handleBackToDashboard}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-medium"
        >
          Back to Dashboard
        </Button>
        
        <Button
          onClick={() => {
            resetCampaignData();
            setActiveTab("campaign-basics");
          }}
          variant="outline"
          className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 py-3 rounded-lg font-medium"
        >
          <Icon name="plus" className="mr-2" />
          Create Another Campaign
        </Button>

        {/* <Button
          onClick={() => {
            console.log("=== CAMPANHA COMPLETA ===");
            console.log("Dados da Campanha:", JSON.stringify(campaignData, null, 2));
            console.log("=== DETALHES ===");
            console.log("Nome da Campanha:", campaignData.campaignName);
            console.log("Nome da Marca:", campaignData.brandName);
            console.log("Tipos de Conteúdo:", campaignData.selectedContentTypes);
            console.log("Plataformas:", campaignData.selectedPlatforms);
            console.log("KPIs Primários:", campaignData.selectedPrimaryKPIs);
            console.log("KPIs Secundários:", campaignData.selectedSecondaryKPIs);
            console.log("Metas Primárias:", campaignData.primaryTargets);
            console.log("Metas Secundárias:", campaignData.secondaryTargets);
            console.log("Orçamento Total:", campaignData.totalBudget);
            console.log("Data de Término:", campaignData.endDate);
            console.log("=== FIM DOS DADOS ===");
            
            // Também mostra um alert para o usuário
            alert("Dados da campanha impressos no console! Abra o DevTools (F12) para ver.");
          }}
          variant="outline"
          className="w-full border-green-300 text-green-700 hover:bg-green-50 py-3 rounded-lg font-medium"
        >
          <Icon name="star" className="mr-2" />
          Imprimir Dados da Campanha
        </Button> */}
      </div>
    </div>
  );
} 
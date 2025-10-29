import { useState, useEffect } from "react";
import { Button } from "../../../components/button";
import { Card } from "../../../components/card";
import Icon from "../../../components/icon";
import { useCampaign } from "../../contexts/CampaignContext";
import { useAuth } from "../../hooks/useAuth";
import { useCreateCampaign } from "../../hooks/useCreateCampaign";

type BudgetTimelineScreenProps = {
  setActiveTab: (tab: string) => void;
};

export function BudgetTimelineScreen({ setActiveTab }: BudgetTimelineScreenProps) {
  const { campaignData, updateBudgetTimeline } = useCampaign();
  const { isConnected } = useAuth();
  const { createCampaign: createCampaignHook, result: createResult, resetState } = useCreateCampaign();
  const [totalBudget, setTotalBudget] = useState(campaignData.totalBudget || "0");
  const [durationDays, setDurationDays] = useState(campaignData.durationDays || "30");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Format currency input
  const formatCurrency = (value: string): string => {
    // Remove all non-numeric characters except decimal point
    const numericValue = value.replace(/[^\d.]/g, '');
    
    // Ensure only one decimal point
    const parts = numericValue.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Limit to 4 decimal places (common for crypto)
    if (parts.length === 2 && parts[1].length > 4) {
      return parts[0] + '.' + parts[1].substring(0, 4);
    }
    
    return numericValue;
  };

  // Format display value with commas for thousands
  const formatDisplayValue = (value: string): string => {
    if (!value || value === '0') return '';
    
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return '';
    
    return numericValue.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4
    });
  };

  // Sync local state with context when context changes
  useEffect(() => {
    if (campaignData.totalBudget) {
      setTotalBudget(campaignData.totalBudget);
    }
    if (campaignData.durationDays) {
      setDurationDays(campaignData.durationDays);
    }
  }, [campaignData.totalBudget, campaignData.durationDays]);

  // Monitor campaign creation result
  useEffect(() => {
    if (createResult.success && isCreating) {
      // Pass transaction hash to success screen
      if (createResult.hash) {
        localStorage.setItem('campaignTransactionHash', createResult.hash);
      }
      setActiveTab("campaign-success");
      setIsCreating(false);
    } else if (createResult.error && isCreating) {
      setError(createResult.error);
      setIsCreating(false);
      
      // Reset the hook state after showing error
      setTimeout(() => {
        resetState();
      }, 3000); // Reset after 3 seconds
    }
  }, [createResult, isCreating, setActiveTab, resetState]);

  // Handle page visibility change (user switches tabs or minimizes)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isCreating) {
        // User switched tabs or minimized window during transaction
        console.log('User switched tabs during transaction');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isCreating]);

  const handleBack = () => {
    setActiveTab("success-metrics");
  };

  const handleCreate = async () => {
    if (!isConnected) {
      setError("Please connect your wallet first");
      return;
    }

    // Validate that all required data is present
    if (!campaignData.campaignName || !campaignData.brandName || 
        !campaignData.likes || !campaignData.views) {
      setError("Please complete all previous steps before creating the campaign");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Update budget and timeline data
      updateBudgetTimeline({ totalBudget, durationDays });
      
      // Create the campaign
      await createCampaignHook({
        totalValue: totalBudget,
        durationDays,
        targetLikes: campaignData.likes,
        targetViews: campaignData.views,
      });
      
      // The useEffect will handle the success/error states
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setIsCreating(false);
    }
  };

  const isFormValid = totalBudget.trim().length > 0 && 
    parseFloat(totalBudget) > 0 &&
    durationDays.trim().length > 0 && 
    parseInt(durationDays) > 0 && parseInt(durationDays) <= 365 &&
    isConnected;

  const isLoading = isCreating || createResult.isLoading || createResult.isPending;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-black">Budget & Timeline</h1>
        <p className="text-gray-600">Set your campaign budget and duration</p>
        {!isConnected && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
            <p className="text-yellow-700 text-sm">
              ⚠️ Please connect your wallet to create a campaign
            </p>
          </div>
        )}
      </div>

      {/* Budget & Timeline Form */}
      <Card className="bg-white p-6 space-y-6">
        {/* Total Budget Input */}
        <div className="space-y-2">
          <label htmlFor="totalBudget" className="block text-sm font-medium text-gray-700">
            Total Budget (ETH) *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 text-lg">Ξ</span>
            </div>
            <input
              id="totalBudget"
              type="text"
              value={formatDisplayValue(totalBudget)}
              onChange={(e) => setTotalBudget(formatCurrency(e.target.value))}
              className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors font-bold text-gray-800"
              placeholder="0.0"
            />
          </div>
          <p className="text-xs text-gray-500">
          Use up to 4 decimal places (e.g. 1.2345 ETH)
          </p>
        </div>

        {/* Duration Input */}
        <div className="space-y-2">
          <label htmlFor="durationDays" className="block text-sm font-medium text-gray-700">
            Campaign Duration (Days) *
          </label>
          <div className="relative">
            <input
              id="durationDays"
              type="number"
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              min="1"
              max="365"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors ${
                durationDays && (parseInt(durationDays) <= 0 || parseInt(durationDays) > 365)
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300'
              }`}
              placeholder="30"
            />
          </div>
          {durationDays && (parseInt(durationDays) <= 0 || parseInt(durationDays) > 365) && (
            <p className="text-sm text-red-600">
              A duração deve ser entre 1 e 365 dias
            </p>
          )}
          <p className="text-xs text-gray-500">
            Entre 1 e 365 dias
          </p>
        </div>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Transaction Status */}
      {isLoading && !error && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <div>
              <p className="text-blue-700 text-sm font-medium">
                {createResult.isPending ? 'Waiting for wallet confirmation...' : 'Creating campaign...'}
              </p>
              <p className="text-blue-600 text-xs">
                {createResult.isPending 
                  ? 'Please approve the transaction in your wallet' 
                  : 'Please wait while we process your campaign'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex space-x-3">
        <Button
          onClick={handleBack}
          variant="outline"
          disabled={isLoading}
          className="flex-1 bg-white border-gray-300 text-gray-700 hover:bg-gray-50 py-3 rounded-lg font-medium disabled:opacity-50"
        >
          <Icon name="arrow-right" className="mr-2 rotate-180" />
          Back
        </Button>
        
        {isLoading ? (
          <>
            <Button
              onClick={() => {
                resetState();
                setIsCreating(false);
                setError(null);
              }}
              variant="outline"
              className="flex-1 bg-red-50 border-red-200 text-red-700 hover:bg-red-100 py-3 rounded-lg font-medium"
            >
              Cancel
            </Button>
            <Button
              disabled
              className="flex-1 bg-blue-500 text-white py-3 rounded-lg font-medium opacity-50 cursor-not-allowed"
            >
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {createResult.isPending ? 'Confirming...' : 'Creating...'}
            </Button>
          </>
        ) : (
          <Button
            onClick={handleCreate}
            disabled={!isFormValid}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Create
          </Button>
        )}
      </div>
    </div>
  );
} 
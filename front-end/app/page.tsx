"use client";

import { ConnectButton } from './components/ConnectButton';
import { useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { Features } from "./components/onboarding/onboarding_features";
import { Button } from "../components/button";
import { Home } from "./components/welcome_screen/welcome";
import { ConnectionScreen } from "./components/connection/connection_screen";
import { DashboardScreen } from "./components/dashboard/dashboard_screen";
import { BottomNavigation } from "./components/navigation/bottom_navigation";
import { CampaignsScreen } from "./components/campaigns/campaigns_screen";
import { CampaignDetailsScreen } from "./components/campaigns/campaign_details_screen";
import { CampaignBasicsScreen } from "./components/create-campaings/campaign_basics_screen";
import { ContentRequirementsScreen } from "./components/create-campaings/content_requirements_screen";
import { SuccessMetricsScreen } from "./components/create-campaings/success_metrics_screen";
import { BudgetTimelineScreen } from "./components/create-campaings/budget_timeline_screen";
import { CampaignSuccessScreen } from "./components/create-campaings/campaign_success_screen";
import { AnalyticsScreen } from "./components/analytics/analytics_screen";
import { SettingsScreen } from "./components/settings/settings_screen";

export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | undefined>(undefined);
  const { isConnected } = useAuth();

  return (
    <div className="flex flex-col min-h-screen font-sans text-[var(--app-foreground)] mini-app-theme from-[var(--app-background)] to-[var(--app-gray)]">
      <div className="w-full max-w-md mx-auto px-4 py-3">
        <header className="flex justify-between items-center mb-6 h-11 relative z-[9999]">
          <h1 className="text-xl font-bold text-[var(--app-foreground)]">Solengaje</h1>
          <div className="flex items-center space-x-2">
            <ConnectButton />
          </div>
        </header>

        <main className={`flex-1 ${(activeTab === "dashboard" || activeTab === "campaigns" || activeTab === "campaign-details" || activeTab === "analytics" || activeTab === "settings" || activeTab === "campaign-basics" || activeTab === "content-requirements" || activeTab === "success-metrics" || activeTab === "budget-timeline" || activeTab === "campaign-success") ? "pb-20" : ""}`}>
          {activeTab === "home" && <Home setActiveTab={setActiveTab} />}
          {activeTab === "connection" && <ConnectionScreen setActiveTab={setActiveTab} />}
          {activeTab === "features" && <Features setActiveTab={setActiveTab} />}
          {activeTab === "dashboard" && <DashboardScreen setActiveTab={setActiveTab} />}
          {activeTab === "campaigns" && <CampaignsScreen setActiveTab={setActiveTab} setSelectedCampaignId={setSelectedCampaignId} />}
          {activeTab === "campaign-details" && <CampaignDetailsScreen setActiveTab={setActiveTab} campaignId={selectedCampaignId} />}
          {activeTab === "campaign-basics" && <CampaignBasicsScreen setActiveTab={setActiveTab} />}
          {activeTab === "content-requirements" && <ContentRequirementsScreen setActiveTab={setActiveTab} />}
          {activeTab === "success-metrics" && <SuccessMetricsScreen setActiveTab={setActiveTab} />}
          {activeTab === "budget-timeline" && <BudgetTimelineScreen setActiveTab={setActiveTab} />}
          {activeTab === "campaign-success" && <CampaignSuccessScreen setActiveTab={setActiveTab} />}
          {activeTab === "analytics" && <AnalyticsScreen />}
          {activeTab === "settings" && <SettingsScreen setActiveTab={setActiveTab} />}
        </main>

        <footer className="mt-2 pt-4 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-[var(--ock-text-foreground-muted)] text-xs"
            onClick={() => window.open("https://morphl2.io", "_blank")}
          >
            Built on Solana Mainnet
          </Button>
        </footer>
      </div>
      
      {/* Bottom Navigation - Only show from dashboard onwards */}
      {(activeTab === "dashboard" || activeTab === "campaigns" || activeTab === "campaign-details" || activeTab === "analytics" || activeTab === "settings" || activeTab === "campaign-basics" || activeTab === "content-requirements" || activeTab === "success-metrics" || activeTab === "budget-timeline" || activeTab === "campaign-success") && (
        <BottomNavigation 
          activeTab={activeTab === "campaign-details" ? "campaigns" : activeTab}
          setActiveTab={setActiveTab} 
          isConnected={isConnected} 
        />
      )}
    </div>
  );
}

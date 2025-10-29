'use client';

import { ReviewCampaign } from '../components/campaign-pay/review-campaing_screen';

// Force dynamic rendering to avoid SSR issues with Privy
export const dynamic = 'force-dynamic';

export default function CampaignPayPage() {
  return (
    <div className="flex flex-col min-h-screen font-sans text-[var(--app-foreground)] mini-app-theme from-[var(--app-background)] to-[var(--app-gray)]">
      <div className="w-full max-w-md mx-auto px-4 py-3">
        <ReviewCampaign campaignId="new" />
      </div>
    </div>
  );
} 
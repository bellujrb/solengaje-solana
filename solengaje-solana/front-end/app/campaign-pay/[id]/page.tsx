import { ReviewCampaign } from '../../components/campaign-pay/review-campaing_screen';

type CampaignPayPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CampaignPayPage({ params }: CampaignPayPageProps) {
  const { id } = await params;
  
  return (
    <div className="flex flex-col min-h-screen font-sans text-[var(--app-foreground)] mini-app-theme from-[var(--app-background)] to-[var(--app-gray)]">
      <div className="w-full max-w-md mx-auto px-4 py-3">
        <ReviewCampaign campaignId={id} />
      </div>
    </div>
  );
} 
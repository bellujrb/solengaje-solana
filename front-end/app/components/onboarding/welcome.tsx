import { Button } from "../../../components/button";
import { Card } from "../../../components/card";
import Icon from "../../../components/icon";

type FeaturesProps = {
  setActiveTab: (tab: string) => void;
};

export function Home({ setActiveTab }: FeaturesProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        {/* Built on Morph Badge */}
        <div className="inline-flex items-center space-x-2 bg-purple-50 text-purple-600 px-3 py-1 rounded-full text-sm font-medium">
          <Icon name="lightning" size="sm" className="text-purple-600" />
          <span>Built on Solana</span>
        </div>

        {/* Main Headline */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-[var(--app-foreground)]">
            A global economy,
          </h1>
          <h1 className="text-3xl font-bold text-[#8B5CF6]">
            built by creators
          </h1>
        </div>

        {/* Description */}
        <p className="text-[var(--app-foreground-muted)] text-base max-w-sm mx-auto">
          The first Web3 platform for creators with automated smart contracts
        </p>

        {/* Launch App Button */}
        <div className="pt-4">
          <Button
            size="lg"
            onClick={() => setActiveTab("features")}
            icon={<Icon name="arrow-right" size="sm" />}
            className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white px-8 py-3"
          >
            Launch App
          </Button>
        </div>
      </div>

      {/* Features Preview */}
      <Card title="Platform Features">
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <Icon name="check" className="text-[#8B5CF6] mt-1" />
            <span className="text-[var(--app-foreground-muted)]">
              Automated smart contracts for creators
            </span>
          </div>
          <div className="flex items-start space-x-3">
            <Icon name="check" className="text-[#8B5CF6] mt-1" />
            <span className="text-[var(--app-foreground-muted)]">
              Global creator economy
            </span>
          </div>
          <div className="flex items-start space-x-3">
            <Icon name="check" className="text-[#8B5CF6] mt-1" />
            <span className="text-[var(--app-foreground-muted)]">
              Web3-native platform
            </span>
          </div>
        </div>
      </Card>

      {/* <TransactionCard /> */}
    </div>
  );
}


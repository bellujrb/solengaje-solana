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
        {/* Built on Solana Badge */}
        <div className="inline-flex items-center space-x-2 bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm font-medium">
          <Icon name="lightning" size="sm" className="text-blue-600" />
          <span>Built on Solana Mainnet</span>
        </div>

        {/* Main Headline */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-[var(--app-foreground)]">
            A global economy,
          </h1>
          <h1 className="text-3xl font-bold text-[#0052FF]">
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
            onClick={() => setActiveTab("connection")}
            icon={<Icon name="arrow-right" size="sm" />}
            className="bg-[#0052FF] hover:bg-[#0043CC] text-white px-8 py-3"
          >
            Launch App
          </Button>
        </div>
      </div>

      {/* Features Preview */}
      <Card title="Platform Features">
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <Icon name="check" className="text-[#0052FF] mt-1" />
            <span className="text-[var(--app-foreground-muted)]">
              Automated smart contracts for creators
            </span>
          </div>
          <div className="flex items-start space-x-3">
            <Icon name="check" className="text-[#0052FF] mt-1" />
            <span className="text-[var(--app-foreground-muted)]">
              Global creator economy
            </span>
          </div>
          <div className="flex items-start space-x-3">
            <Icon name="check" className="text-[#0052FF] mt-1" />
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
import { Button } from "../../../components/button";
import { Card } from "../../../components/card";
import Icon from "../../../components/icon";
import { useState } from "react";
import { useAccount } from "../../hooks/useAccount";
import { ConnectButton } from '../ConnectButton';

type ConnectionScreenProps = {
  setActiveTab: (tab: string) => void;
};

export function ConnectionScreen({ setActiveTab }: ConnectionScreenProps) {
  const { isConnected } = useAccount();
  const [instagramConnected, setInstagramConnected] = useState(false);
  const [isConnectingInstagram, setIsConnectingInstagram] = useState(false);

  const handleConnectInstagram = async () => {
    setIsConnectingInstagram(true);
    // Simular delay de conexão
    setTimeout(() => {
      setInstagramConnected(true);
      setIsConnectingInstagram(false);
    }, 2000);
  };

  const handleContinue = () => {
    setActiveTab("dashboard");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold text-black">
          Connect your wallet and Instagram
        </h1>
      </div>

      {/* Connection Card */}
      <Card className="bg-white p-6 space-y-4">
        {/* Wallet Connection */}
        <div className="space-y-3 mb-2">
          {isConnected ? (
            <>
              <Button
                variant="ghost"
                className="w-full bg-blue-100 text-blue-600 hover:bg-blue-200 justify-start"
                disabled
              >
                <Icon name="wallet" className="mr-2" />
                Wallet Connected
              </Button>
              <div className="flex items-center space-x-2 text-green-600 text-sm bg-[#EFF6FF] p-3 rounded-lg">
                <Icon name="check" className="text-green-600" />
                <span>Morph Holesky wallet connected</span>
              </div>
            </>
          ) : (
              <div className="flex justify-center w-max">
                <ConnectButton />
              </div>
          )}
        </div>

        {/* Instagram Connection */}
        <div className="space-y-3">
          {!instagramConnected ? (
            <Button
              onClick={handleConnectInstagram}
              disabled={isConnectingInstagram}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white justify-start"
            >
              <Icon name="camera" className="mr-2" />
              {isConnectingInstagram ? "Connecting..." : "Connect Instagram"}
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                className="w-full bg-green-100 text-green-600 hover:bg-green-200 justify-start"
                disabled
              >
                <Icon name="camera" className="mr-2" />
                Instagram Connected
              </Button>
              <div className="flex items-center space-x-2 text-green-600 text-sm bg-[#EFF6FF] p-3 rounded-lg">
                <Icon name="check" className="text-green-600" />
                <span>Instagram connected</span>
              </div>
            </>
          )}
        </div>

        {/* Continue Button */}
        {isConnected && instagramConnected && (
          <div className="pt-4">
            <Button
              onClick={handleContinue}
              className="w-full bg-[#0052FF] hover:bg-[#0043CC] text-white"
              size="lg"
            >
              Continue to App
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
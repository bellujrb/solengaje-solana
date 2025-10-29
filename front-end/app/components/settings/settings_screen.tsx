import { Button } from "../../../components/button";
import { Card } from "../../../components/card";
import Icon from "../../../components/icon";
import { useAuth, useDisconnect } from "../../hooks/useAuth";
import { ConnectButton } from '../ConnectButton';

type SettingsScreenProps = {
  setActiveTab: (tab: string) => void;
};

export function SettingsScreen({ setActiveTab }: SettingsScreenProps) {
  const { walletAddress: address, isConnected } = useAuth();
  const { disconnect } = useDisconnect();

  const handleSignOut = () => {
    disconnect();
    setActiveTab("home");
  };

  const handleContactSupport = () => {
    // Implementar contato com suporte
    console.log("Contact support");
  };

  const handleRateApp = () => {
    // Implementar avaliação do app
    console.log("Rate app");
  };

  const handlePrivacyPolicy = () => {
    // Implementar política de privacidade
    console.log("Privacy policy");
  };

  const handleTermsOfService = () => {
    // Implementar termos de serviço
    console.log("Terms of service");
  };

  if (!isConnected) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-black">
            Settings
          </h1>
          <p className="text-gray-600">
            Connect your wallet to access settings and preferences
          </p>
        </div>

        <Card className="bg-white p-6 space-y-4">
          <div className="text-center space-y-4">
            <Icon name="check" className="mx-auto text-gray-400" size="lg" />
            <h2 className="text-lg font-semibold text-gray-700">
              Connect Wallet Required
            </h2>
            <p className="text-gray-500 text-sm">
              You need to connect your wallet to access settings
            </p>
            <ConnectButton />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-black">Settings</h1>
        <p className="text-gray-600">Manage your account and preferences</p>
      </div>

      {/* Connected Accounts */}
      <Card className="bg-white p-4">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Icon name="arrow-right" className="text-blue-600" size="sm" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-black">Connected Accounts</h3>
            <p className="text-sm text-gray-600">Manage your connected social media and wallet</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Instagram */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 via-orange-500 to-yellow-500 rounded-lg flex items-center justify-center">
                <Icon name="camera" className="text-white" size="sm" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Connected as Instagram</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-green-600">Connected</span>
              <Icon name="check" className="text-gray-400" size="sm" />
            </div>
          </div>

          {/* Wallet */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <Icon name="wallet" className="text-white" size="sm" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Not connected"}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-green-600">Connected</span>
              <Icon name="check" className="text-gray-400" size="sm" />
            </div>
          </div>
        </div>
      </Card>

      {/* Support & Help */}
      <Card className="bg-white p-4">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Icon name="star" className="text-blue-600" size="sm" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-black">Support & Help</h3>
            <p className="text-sm text-gray-600">Get help and provide feedback</p>
          </div>
        </div>

        <div className="space-y-2">
          {/* Contact Support */}
          <button 
            onClick={handleContactSupport}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div className="flex items-center space-x-3">
              <Icon name="star" className="text-gray-600" size="sm" />
              <span className="text-sm text-gray-800">Contact support</span>
            </div>
            <Icon name="arrow-right" className="text-gray-400" size="sm" />
          </button>

          {/* Rate the app */}
          <button 
            onClick={handleRateApp}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div className="flex items-center space-x-3">
              <Icon name="heart" className="text-gray-600" size="sm" />
              <span className="text-sm text-gray-800">Rate the app</span>
            </div>
            <Icon name="arrow-right" className="text-gray-400" size="sm" />
          </button>

          {/* Privacy Policy */}
          <button 
            onClick={handlePrivacyPolicy}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div className="flex items-center space-x-3">
              <Icon name="check" className="text-gray-600" size="sm" />
              <span className="text-sm text-gray-800">Privacy policy</span>
            </div>
            <Icon name="arrow-right" className="text-gray-400" size="sm" />
          </button>

          {/* Terms of Service */}
          <button 
            onClick={handleTermsOfService}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div className="flex items-center space-x-3">
              <Icon name="plus" className="text-gray-600" size="sm" />
              <span className="text-sm text-gray-800">Terms of service</span>
            </div>
            <Icon name="arrow-right" className="text-gray-400" size="sm" />
          </button>
        </div>
      </Card>

      {/* Sign Out Button */}
      <Button
        onClick={handleSignOut}
        className="w-full bg-gray-800 text-white hover:bg-gray-900 py-3 rounded-lg flex items-center justify-center space-x-2"
      >
        <Icon name="arrow-right" className="text-white" size="sm" />
        <span>Sign out</span>
      </Button>
    </div>
  );
}
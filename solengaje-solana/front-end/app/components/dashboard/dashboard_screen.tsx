import { Button } from "../../../components/button";
import { Card } from "../../../components/card";
import Icon from "../../../components/icon";
import { useAccount } from "../../hooks/useAccount";
import { ConnectButton } from '../ConnectButton';
import { useWalletBalance } from "../../hooks/useWalletBalance";
import { useWalletTransactions } from "../../hooks/useWalletTransactions";

type DashboardScreenProps = {
  setActiveTab: (tab: string) => void;
};

export function DashboardScreen({ setActiveTab }: DashboardScreenProps) {
  const { isConnected } = useAccount();
  const { formattedBalance, isLoading, balance, usdValue } = useWalletBalance();
  const { transactions, isLoading: transactionsLoading } = useWalletTransactions();

  if (!isConnected) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-black">
            Dashboard
          </h1>
          <p className="text-gray-600">
            Connect your wallet to view your dashboard and analytics
          </p>
        </div>

        <Card className="bg-white p-6 space-y-4">
          <div className="text-center space-y-4">
            <Icon name="star" className="mx-auto text-gray-400" size="lg" />
            <h2 className="text-lg font-semibold text-gray-700">
              Connect Wallet Required
            </h2>
            <p className="text-gray-500 text-sm">
              You need to connect your wallet to access the dashboard
            </p>
            <ConnectButton />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Blue Header Card */}
      <Card className="bg-blue-500 p-6 text-white">
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-gray-200 text-sm font-normal">Total balance</p>
            <h1 className="text-4xl font-bold text-white">
              {isLoading ? "Loading..." : `${formattedBalance}`}
            </h1>
            <p className="text-gray-200 text-sm">
              {usdValue ? `≈ $${usdValue.toLocaleString()}` : balance === 0 ? "$0.00" : "Loading USD value..."}
            </p>
          </div>
          
          <div className="flex space-x-3">
            <Button
              variant="secondary"
              className="flex-1 bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 justify-start border-0"
              onClick={() => setActiveTab("campaign-basics")}
            >
              <Icon name="plus" className="mr-2" />
              New Campaign
            </Button>
            <Button
              variant="secondary"
              className="flex-1 bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 justify-start border-0"
              onClick={() => setActiveTab("analytics")}
            >
              <Icon name="star" className="mr-2" />
              Analytics
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="space-y-3">
            <div className="bg-purple-100 rounded-lg p-2 inline-block">
              <h2 className="text-2xl font-bold text-[#9637EC]">3.200</h2>
            </div>
            <p className="text-gray-600 text-sm">Total views</p>
            <p className="text-green-600 text-xs">8% this month</p>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="space-y-3">
            <div className="bg-purple-100 rounded-lg p-2 inline-block">
              <h2 className="text-2xl font-bold text-[#9637EC]">0</h2>
            </div>
            <p className="text-gray-600 text-sm">Active Campaings</p>
            <p className="text-green-600 text-xs">0 this month</p>
          </div>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-black">Recent transactions</h2>
            <Button variant="ghost" className="text-blue-500 p-0 h-auto">
              View all
            </Button>
          </div>
          
          <div className="space-y-3">
            {transactionsLoading ? (
              <div className="text-center py-4">
                <p className="text-gray-500">Loading transactions...</p>
              </div>
            ) : transactions.length > 0 ? (
              transactions.slice(0, 3).map((transaction) => (
                <div key={transaction.id} className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    transaction.type === 'incoming' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    <Icon name={transaction.icon} className={
                      transaction.type === 'incoming' ? 'text-green-600' : 'text-red-600'
                    } />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-black">
                      {transaction.type === 'incoming' ? 'Received' : 'Sent'} 
                    </p>
                    <p className="text-gray-500 text-sm">{transaction.date}</p>
                  </div>
                  <p className={`font-medium ${
                    transaction.type === 'incoming' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.amount}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500">No transactions found</p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
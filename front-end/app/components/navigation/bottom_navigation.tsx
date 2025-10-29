import Icon from "../../../components/icon";

type BottomNavigationProps = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isConnected: boolean;
};

type NavigationItem = {
  id: string;
  label: string;
  icon: "heart" | "star" | "check" | "plus" | "arrow-right" | "lightning" | "wallet" | "camera";
};

export function BottomNavigation({ activeTab, setActiveTab, isConnected }: BottomNavigationProps) {
  const navigationItems: NavigationItem[] = [
    {
      id: "dashboard",
      label: "Home",
      icon: "star" // Using star as home icon since house isn't available
    },
    {
      id: "campaigns",
      label: "Campaigns",
      icon: "heart" // Using heart as campaigns icon
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: "lightning" // Using lightning as analytics icon
    },
    {
      id: "settings",
      label: "Settings",
      icon: "check" // Using check as settings icon
    }
  ];

  const handleTabPress = (tabId: string) => {
    if (!isConnected && tabId !== "dashboard") {
      // If not connected, only allow dashboard tab
      return;
    }
    setActiveTab(tabId);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-40">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navigationItems.map((item) => {
          const isActive = activeTab === item.id;
          const isDisabled = !isConnected && item.id !== "dashboard";
          
          return (
            <button
              key={item.id}
              onClick={() => handleTabPress(item.id)}
              disabled={isDisabled}
              className={`flex flex-col items-center space-y-1 py-2 px-3 rounded-lg transition-colors ${
                isActive
                  ? "text-blue-500"
                  : isDisabled
                  ? "text-gray-300"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon 
                name={item.icon} 
                className={`${isActive ? "text-blue-500" : isDisabled ? "text-gray-300" : "text-gray-500"}`}
              />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
} 
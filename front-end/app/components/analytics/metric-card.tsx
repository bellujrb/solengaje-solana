import { Card } from "../../../components/card";
import Icon from "../../../components/icon";

type MetricCardProps = {
  id: string;
  title: string;
  value: string;
  icon: "star" | "heart" | "check" | "plus" | "arrow-right" | "lightning" | "wallet" | "camera";
  iconColor: string;
  iconBgColor: string;
  trend: string;
  isSelected?: boolean;
  onClick: () => void;
};

export function MetricCard({ 
  title, 
  value, 
  icon, 
  iconColor, 
  iconBgColor, 
  trend, 
  isSelected, 
  onClick 
}: MetricCardProps) {
  return (
    <Card 
      className={`bg-white p-4 cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'border-2 border-blue-500' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        {/* Icon */}
        <div className={`p-2 rounded-lg ${iconBgColor}`}>
          <Icon 
            name={icon} 
            className={iconColor} 
            size="sm" 
          />
        </div>
        
        {/* Trend */}
        <div className="bg-blue-100 px-2 py-1 rounded-full flex items-center space-x-1">
          <Icon name="arrow-right" className="text-green-600 rotate-[-45deg]" size="sm" />
          <span className="text-xs font-medium text-green-600">{trend}</span>
        </div>
      </div>
      
      {/* Value and Label */}
      <div>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-sm text-gray-700 mt-1">{title}</p>
      </div>
    </Card>
  );
} 
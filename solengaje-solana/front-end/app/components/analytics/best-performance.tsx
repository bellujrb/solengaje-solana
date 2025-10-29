import { Card } from "../../../components/card";

type BestPerformanceProps = {
  bestDay: {
    day: string;
    percentage: string;
  };
  peakHours: {
    hours: string;
    percentage: string;
  };
  topContentType: {
    type: string;
    percentage: string;
  };
};

export function BestPerformance({ bestDay, peakHours, topContentType }: BestPerformanceProps) {
  return (
    <Card className="bg-white p-4">
      <h3 className="text-lg font-semibold text-black mb-4">Best Performance</h3>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Best day:</span>
          <div className="text-right">
            <p className="text-sm font-bold text-gray-800">{bestDay.day}</p>
            <p className="text-xs text-green-600">{bestDay.percentage}</p>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Peak hours:</span>
          <div className="text-right">
            <p className="text-sm font-bold text-gray-800">{peakHours.hours}</p>
            <p className="text-xs text-green-600">{peakHours.percentage}</p>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Top content type:</span>
          <div className="text-right">
            <p className="text-sm font-bold text-gray-800">{topContentType.type}</p>
            <p className="text-xs text-green-600">{topContentType.percentage}</p>
          </div>
        </div>
      </div>
    </Card>
  );
} 
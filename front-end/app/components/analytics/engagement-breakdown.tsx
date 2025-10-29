import { Card } from "../../../components/card";

type EngagementBreakdownProps = {
  likes: number;
  comments: number;
  shares: number;
};

export function EngagementBreakdown({ likes, comments, shares }: EngagementBreakdownProps) {
  return (
    <Card className="bg-white p-4">
      <h3 className="text-lg font-semibold text-black mb-4">Engagement Breakdown</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Likes</span>
          <div className="flex-1 mx-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-red-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${likes}%` }}
              ></div>
            </div>
          </div>
          <span className="text-sm font-bold text-gray-800">{likes}%</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Comments</span>
          <div className="flex-1 mx-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${comments}%` }}
              ></div>
            </div>
          </div>
          <span className="text-sm font-bold text-gray-800">{comments}%</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Shares</span>
          <div className="flex-1 mx-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${shares}%` }}
              ></div>
            </div>
          </div>
          <span className="text-sm font-bold text-gray-800">{shares}%</span>
        </div>
      </div>
    </Card>
  );
} 
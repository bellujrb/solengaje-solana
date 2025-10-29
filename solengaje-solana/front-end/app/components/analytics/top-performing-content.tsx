import { Card } from "../../../components/card";
import Icon from "../../../components/icon";

type ContentItem = {
  id: string;
  views: string;
  likes: string;
  comments: string;
  date: string;
  engagement: string;
};

type TopPerformingContentProps = {
  content: ContentItem[];
  onViewAll?: () => void;
};

export function TopPerformingContent({ content, onViewAll }: TopPerformingContentProps) {
  return (
    <Card className="bg-white p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-black">Top performing content</h3>
        <button 
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          onClick={onViewAll}
        >
          View all
        </button>
      </div>
      
      <div className="space-y-4">
        {content.map((item) => (
          <div key={item.id} className="flex items-center space-x-3">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex-shrink-0"></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-4 mb-1">
                <div className="flex items-center space-x-1">
                  <Icon name="star" className="text-gray-500" size="sm" />
                  <span className="text-xs text-gray-600">{item.views}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Icon name="heart" className="text-gray-500" size="sm" />
                  <span className="text-xs text-gray-600">{item.likes}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Icon name="check" className="text-gray-500" size="sm" />
                  <span className="text-xs text-gray-600">{item.comments}</span>
                </div>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-xs text-gray-500">{item.date}</span>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-600">{item.engagement}</p>
                  <p className="text-xs text-gray-500">engagement</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
} 
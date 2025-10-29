export type MetricCard = {
  id: string;
  title: string;
  value: string;
  icon: "star" | "heart" | "check" | "plus" | "arrow-right" | "lightning" | "wallet" | "camera";
  iconColor: string;
  iconBgColor: string;
  trend: string;
  isSelected?: boolean;
};

export type ChartData = {
  day: string;
  value: number;
  lastWeek: number;
};

export type ContentItem = {
  id: string;
  views: string;
  likes: string;
  comments: string;
  date: string;
  engagement: string;
};

export type BestPerformanceData = {
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
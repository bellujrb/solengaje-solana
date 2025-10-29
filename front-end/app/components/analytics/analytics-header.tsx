
type AnalyticsHeaderProps = {
  title: string;
  description: string;
  onDownload?: () => void;
  onFilter?: () => void;
};

export function AnalyticsHeader({ title, description  }: AnalyticsHeaderProps) {
  return (
    <div className="flex justify-between items-start">
      <div>
        <h1 className="text-2xl font-bold text-black">{title}</h1>
        <p className="text-gray-600 mt-1">{description}</p>
      </div>
    </div>
  );
} 
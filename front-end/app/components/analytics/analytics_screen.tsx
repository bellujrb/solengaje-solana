import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { ConnectButton } from '../ConnectButton';
import { AnalyticsHeader } from "./analytics-header";
import { TimeFilters } from "./time-filters";
import { MetricCard } from "./metric-card";
import { PerformanceChart } from "./performance-chart";
import { EngagementBreakdown } from "./engagement-breakdown";

import { MetricCard as MetricCardType, ChartData } from "./types";
import { Card } from "@/components/card";
import Icon from "@/components/icon";

export function AnalyticsScreen() {
  const { isConnected } = useAuth();
  const [activeTimeFilter, setActiveTimeFilter] = useState("7 days");
  const [selectedMetric, setSelectedMetric] = useState("views");

  const timeFilters = ["7 days", "30 days", "3 months", "1 year"];

  // Dados do gráfico para diferentes métricas
  const chartData: Record<string, ChartData[]> = {
    views: [
      { day: 'Mon', value: 0.0, lastWeek: 0.0 },
      { day: 'Tue', value: 0.1, lastWeek: 0.08 },
      { day: 'Wed', value: 0.0, lastWeek: 0.05 },
      { day: 'Thu', value: 0.1, lastWeek: 0.12 },
      { day: 'Fri', value: 0.1, lastWeek: 0.09 },
      { day: 'Sat', value: 0.1, lastWeek: 0.15 },
      { day: 'Sun', value: 0.1, lastWeek: 0.11 }
    ],
    engagement: [
      { day: 'Mon', value: 6.5,   lastWeek: 6.0},
      { day: 'Tue', value: 8.5,   lastWeek: 6.6},
      { day: 'Wed', value: 6.13,  lastWeek: 6.9},
      { day: 'Thu', value: 8.88,  lastWeek: 8.0},
      { day: 'Fri', value: 8.13,  lastWeek: 7.6},
      { day: 'Sat', value: 10.5,  lastWeek: 10.2},
      { day: 'Sun', value: 9.88,  lastWeek: 9.0}
    ],
    earnings: [
      { day: 'Mon', value: 0, lastWeek: 0 },
      { day: 'Tue', value: 0, lastWeek: 0 },
      { day: 'Wed', value: 0, lastWeek: 0 },
      { day: 'Thu', value: 0, lastWeek: 0 },
      { day: 'Fri', value: 0, lastWeek: 0 },
      { day: 'Sat', value: 0, lastWeek: 0 },
      { day: 'Sun', value: 0, lastWeek: 0 }
    ],
    campaigns: [
      { day: 'Mon', value: 0, lastWeek: 0 },
      { day: 'Tue', value: 0, lastWeek: 0 },
      { day: 'Wed', value: 0, lastWeek: 0 },
      { day: 'Thu', value: 0, lastWeek: 0 },
      { day: 'Fri', value: 0, lastWeek: 0 },
      { day: 'Sat', value: 0, lastWeek: 0 },
      { day: 'Sun', value: 0, lastWeek: 0 }
    ]
  };

  const metrics: MetricCardType[] = [
    {
      id: "views",
      title: "Views",
      value: "3.200",
      icon: "star",
      iconColor: "text-white",
      iconBgColor: "bg-blue-500",
      trend: "8%",
      isSelected: true
    },
    {
      id: "engagement",
      title: "Engagement",
      value: "25%",
      icon: "heart",
      iconColor: "text-white",
      iconBgColor: "bg-red-500",
      trend: "1%",
    },
    {
      id: "earnings",
      title: "Earnings",
      value: "0",
      icon: "check",
      iconColor: "text-white",
      iconBgColor: "bg-green-500",
      trend: "23.5%"
    },
    {
      id: "campaigns",
      title: "Campaigns",
      value: "0",
      icon: "plus",
      iconColor: "text-white",
      iconBgColor: "bg-purple-500",
      trend: "15%"
    }
  ];

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case 'views': return 'Views';
      case 'engagement': return 'Engagement';
      case 'earnings': return 'Earnings';
      case 'campaigns': return 'Campaigns';
      default: return 'Views';
    }
  };

  const getValueFormatter = (metric: string) => {
    switch (metric) {
      case 'views': return (value: number) => `${value.toFixed(1)}M`;
      case 'engagement': return (value: number) => `${value.toFixed(1)}%`;
      case 'earnings': return (value: number) => `$${value.toLocaleString()}`;
      case 'campaigns': return (value: number) => value.toString();
      default: return (value: number) => value.toString();
    }
  };

  const handleDownload = () => {
    // Implementar download dos dados
  };

  const handleFilter = () => {
    // Implementar filtros adicionais
  };

  if (!isConnected) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-black">
            Analytics
          </h1>
          <p className="text-gray-600">
            Connect your wallet to view your analytics and insights
          </p>
        </div>

        <Card className="bg-white p-6 space-y-4">
          <div className="text-center space-y-4">
            <Icon name="star" className="mx-auto text-gray-400" size="lg" />
            <h2 className="text-lg font-semibold text-gray-700">
              Connect Wallet Required
            </h2>
            <p className="text-gray-500 text-sm">
              You need to connect your wallet to access analytics
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
      <AnalyticsHeader
        title="Analytics"
        description="Track your performance across all campaigns"
        onDownload={handleDownload}
        onFilter={handleFilter}
      />

      {/* Time Period Filters */}
      <TimeFilters
        filters={timeFilters}
        activeFilter={activeTimeFilter}
        onFilterChange={setActiveTimeFilter}
      />

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.id}
            {...metric}
            isSelected={selectedMetric === metric.id}
            onClick={() => setSelectedMetric(metric.id)}
          />
        ))}
      </div>

      {/* Performance Chart */}
      <PerformanceChart
        data={chartData[selectedMetric]}
        selectedMetric={selectedMetric}
        getValueFormatter={getValueFormatter}
        getMetricLabel={getMetricLabel}
      />

      {/* Engagement Breakdown */}
      <EngagementBreakdown
        likes={68}
        comments={24}
        shares={8}
      />

      {/* <BestPerformance {...bestPerformanceData} />

      <TopPerformingContent
        content={topContent}
        onViewAll={handleViewAll}
      /> */}
    </div>
  );
}
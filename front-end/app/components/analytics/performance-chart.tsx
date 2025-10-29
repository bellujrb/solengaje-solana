import { Card } from "../../../components/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChartData } from './types';

type PerformanceChartProps = {
  data: ChartData[];
  selectedMetric: string;
  getValueFormatter: (metric: string) => (value: number) => string;
  getMetricLabel: (metric: string) => string;
};

export function PerformanceChart({ 
  data, 
  selectedMetric, 
  getValueFormatter, 
  getMetricLabel 
}: PerformanceChartProps) {
  return (
    <Card className="bg-white p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-black">Performance Trend</h3>
        <div className="w-32 h-8 bg-gray-100 rounded-lg"></div>
      </div>
      
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="day" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickFormatter={getValueFormatter(selectedMetric)}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            formatter={(value: number) => [getValueFormatter(selectedMetric)(value), getMetricLabel(selectedMetric)]}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            iconType="circle"
            wrapperStyle={{ paddingTop: '20px' }}
          />
          <Bar 
            dataKey="value" 
            fill="#3b82f6" 
            radius={[4, 4, 0, 0]}
            name={getMetricLabel(selectedMetric)}
          />
          <Bar 
            dataKey="lastWeek" 
            fill="#e5e7eb" 
            radius={[4, 4, 0, 0]}
            name="Last 7 days"
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
} 
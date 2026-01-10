"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface AppVersionsChartProps {
  data: Array<{ version: string; count: number; percentage: number }>;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export function AppVersionsChart({ data }: AppVersionsChartProps) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{`Version ${data.version}`}</p>
          <p className="text-sm text-gray-600">
            {`${data.count?.toLocaleString() || 0} users (${data.percentage?.toFixed(1) || 0}%)`}
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-col space-y-2 mt-4">
        {payload?.map((entry: any, index: number) => (
          <div key={index} className="flex items-center space-x-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="font-medium">{entry.version || entry.payload?.version || 'Unknown'}</span>
            <span className="text-gray-500">
              ({(entry.count || entry.payload?.count || 0).toLocaleString()} users)
            </span>
          </div>
        )) || []}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">
          App Versions
        </CardTitle>
        <p className="text-sm text-gray-500">
          Distribution of app versions among users
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={2}
                dataKey="count"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <CustomLegend payload={data.map((item, index) => ({ 
          ...item, 
          color: COLORS[index % COLORS.length] 
        }))} />
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Latest Version:</span>
            <span className="font-semibold text-green-600">
              {data[0]?.version || 'N/A'} ({data[0]?.percentage?.toFixed(1) || 0}%)
            </span>
          </div>
          <div className="flex justify-between items-center text-sm mt-2">
            <span className="text-gray-600">Total Versions:</span>
            <span className="font-semibold">{data.length}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
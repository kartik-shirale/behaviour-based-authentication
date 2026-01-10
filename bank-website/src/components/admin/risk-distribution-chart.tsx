"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BehavioralSession } from "@/data-testing";

interface RiskDistributionChartProps {
  sessions: BehavioralSession[];
}

const BEHAVIOR_COLORS = {
  "Motion": "#10b981",
  "Touch": "#84cc16", 
  "Typing": "#f59e0b"
};

export function RiskDistributionChart({ sessions }: RiskDistributionChartProps) {
  // Analyze behavior patterns in sessions
  const getBehaviorColor = (category: string) => {
    return BEHAVIOR_COLORS[category as keyof typeof BEHAVIOR_COLORS] || "#6b7280";
  };

  // Generate behavior pattern distribution data
  const generateDistributionData = () => {
    const totalSessions = sessions.length;
    const behaviorData = [
      {
        category: "Motion",
        count: sessions.filter(s => s.motionPattern && s.motionPattern.length > 0).length,
        description: "Sessions with motion patterns"
      },
      {
        category: "Touch",
        count: sessions.filter(s => s.touchPatterns && s.touchPatterns.length > 0).length,
        description: "Sessions with touch patterns"
      },
      {
        category: "Typing",
        count: sessions.filter(s => s.typingPatterns && s.typingPatterns.length > 0).length,
        description: "Sessions with typing patterns"
      },

    ];
    
    return behaviorData.map(item => {
      const percentage = totalSessions > 0 ? (item.count / totalSessions) * 100 : 0;
      
      return {
        category: item.category,
        count: item.count,
        percentage: Number(percentage.toFixed(1)),
        description: item.description,
        color: getBehaviorColor(item.category)
      };
    });
  };

  const chartData = generateDistributionData();
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{label} Patterns</p>
          <p className="text-sm text-gray-600">
            Sessions: {data.count.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600">
            Percentage: {data.percentage}%
          </p>
          <p className="text-sm text-gray-600">
            {data.description}
          </p>
        </div>
      );
    }
    return null;
  };

  const totalSessions = sessions.length;
  const motionSessions = chartData.find(item => item.category === "Motion")?.count || 0;
  const interactionSessions = chartData
    .filter(item => item.category === "Touch" || item.category === "Typing")
    .reduce((sum, item) => sum + item.count, 0);
  const deviceNetworkSessions = chartData
    .filter(item => item.category === "Device" || item.category === "Network")
    .reduce((sum, item) => sum + item.count, 0);

  const getBehaviorBadgeVariant = (category: string) => {
    switch (category) {
      case "Motion":
      case "Touch":
        return "default";
      case "Typing":
        return "secondary";
      case "Network":
      case "Device":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">
          Behavior Pattern Distribution
        </CardTitle>
        <div className="text-sm text-gray-500">
          Session categorization by behavioral data types
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 && totalSessions > 0 ? (
          <>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="category" 
                    tick={{ fontSize: 12 }}
                    tickLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickLine={{ stroke: '#e5e7eb' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {motionSessions.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">Motion Patterns</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {totalSessions.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">Total Sessions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {interactionSessions.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">Interaction Patterns</div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="text-sm font-medium text-gray-900 mb-3">Behavior Categories</div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {chartData.map((item, index) => (
                  <div key={index} className="text-center p-2 bg-gray-50 rounded-lg">
                    <Badge 
                      variant={getBehaviorBadgeVariant(item.category)}
                      className="mb-1 text-xs"
                    >
                      {item.category}
                    </Badge>
                    <div className="text-sm font-medium text-gray-900">
                      {item.count}
                    </div>
                    <div className="text-xs text-gray-500">
                      {item.percentage}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-2">No behavior data available</div>
            <div className="text-sm text-gray-400">
              Behavior pattern distribution will appear here once session data is available
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
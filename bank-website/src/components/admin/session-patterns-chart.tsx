"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BehavioralSession } from "@/data-testing";
import { format, subDays, startOfDay } from "date-fns";

interface SessionPatternsChartProps {
  sessions: BehavioralSession[];
}

export function SessionPatternsChart({ sessions }: SessionPatternsChartProps) {
  // Generate data for the last 30 days
  const generateChartData = () => {
    const days = 30;
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = startOfDay(subDays(new Date(), i));
      const dayStart = date.getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      
      const daySessions = sessions.filter(session => {
        const sessionTime = new Date(session.timestamp).getTime();
        return sessionTime >= dayStart && sessionTime < dayEnd;
      });
      
      const totalSessions = daySessions.length;
      const motionSessions = daySessions.filter(s => s.motionPattern && s.motionPattern.length > 0).length;
      const touchSessions = daySessions.filter(s => s.touchPatterns && s.touchPatterns.length > 0).length;
      const typingSessions = daySessions.filter(s => s.typingPatterns && s.typingPatterns.length > 0).length;

      
      data.push({
        date: format(date, 'MMM dd'),
        fullDate: date,
        totalSessions,
        motionSessions,
        touchSessions,
        typingSessions,

      });
    }
    
    return data;
  };

  const chartData = generateChartData();
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value} sessions
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const totalSessions = chartData.reduce((sum, day) => sum + day.totalSessions, 0);
  const totalMotionSessions = chartData.reduce((sum, day) => sum + day.motionSessions, 0);
  const totalTouchSessions = chartData.reduce((sum, day) => sum + day.touchSessions, 0);
  const totalTypingSessions = chartData.reduce((sum, day) => sum + day.typingSessions, 0);


  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">
          Behavior Patterns (Last 30 Days)
        </CardTitle>
        <div className="text-sm text-gray-500">
          Behavioral data trends and pattern distribution over time
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis 
                    yAxisId="sessions"
                    orientation="left"
                    tick={{ fontSize: 12 }}
                    tickLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis 
                    yAxisId="patterns"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    tickLine={{ stroke: '#e5e7eb' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    yAxisId="sessions"
                    type="monotone"
                    dataKey="totalSessions"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    name="Total Sessions"
                  />
                  <Line
                    yAxisId="patterns"
                    type="monotone"
                    dataKey="motionSessions"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    name="Motion Patterns"
                  />
                  <Line
                    yAxisId="patterns"
                    type="monotone"
                    dataKey="touchSessions"
                    stroke="#84cc16"
                    strokeWidth={2}
                    dot={{ fill: '#84cc16', strokeWidth: 2, r: 4 }}
                    name="Touch Patterns"
                  />
                  <Line
                    yAxisId="patterns"
                    type="monotone"
                    dataKey="typingSessions"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                    name="Typing Patterns"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {totalSessions.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">Total Sessions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {totalMotionSessions.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">Motion Patterns</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-lime-600">
                  {totalTouchSessions.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">Touch Patterns</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">
                  {totalTypingSessions.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">Typing Patterns</div>
              </div>

            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-2">No session data available</div>
            <div className="text-sm text-gray-400">
              Session patterns will appear here once data is available
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
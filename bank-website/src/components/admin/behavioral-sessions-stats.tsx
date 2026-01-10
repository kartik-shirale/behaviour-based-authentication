"use client";

import { Activity, Shield, AlertTriangle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BehavioralSession } from "@/data-testing";

interface BehavioralSessionsStatsProps {
  sessions: BehavioralSession[];
}

export function BehavioralSessionsStats({ sessions }: BehavioralSessionsStatsProps) {
  const totalSessions = sessions.length;
  
  // Calculate sessions with different behavior patterns
  const sessionsWithMotion = sessions.filter(s => s.motionPattern && s.motionPattern.length > 0).length;
  const sessionsWithTouch = sessions.filter(s => s.touchPatterns && s.touchPatterns.length > 0).length;
  const sessionsWithTyping = sessions.filter(s => s.typingPatterns && s.typingPatterns.length > 0).length;
  
  // Calculate average motion patterns per session
  const averageMotionPatterns = totalSessions > 0 
    ? sessions.reduce((sum, s) => sum + (s.motionPattern?.length || 0), 0) / totalSessions 
    : 0;
  

  
  // Get today's sessions for daily comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todaySessions = sessions.filter(s => {
    const sessionDate = new Date(s.timestamp);
    sessionDate.setHours(0, 0, 0, 0);
    return sessionDate.getTime() === today.getTime();
  });
  
  const motionPercentage = totalSessions > 0 ? (sessionsWithMotion / totalSessions) * 100 : 0;
  const todayMotionSessions = todaySessions.filter(s => s.motionPattern && s.motionPattern.length > 0).length;



  const stats = [
    {
      title: "Total Sessions",
      value: totalSessions.toLocaleString(),
      change: `${todaySessions.length} today`,
      changeType: "neutral" as const,
      icon: Activity,
      description: `Avg motion patterns: ${averageMotionPatterns.toFixed(1)}`
    },
    {
      title: "Motion Patterns",
      value: sessionsWithMotion.toLocaleString(),
      change: `${motionPercentage.toFixed(1)}% of total`,
      changeType: motionPercentage >= 70 ? "positive" : motionPercentage >= 40 ? "neutral" : "negative" as const,
      icon: Shield,
      description: "Sessions with motion data"
    },
    {
      title: "Touch & Typing",
      value: `${sessionsWithTouch}/${sessionsWithTyping}`,
      change: "Touch/Typing",
      changeType: "neutral" as const,
      icon: AlertTriangle,
      description: "Interaction patterns"
    },
    {
      title: "Typing Patterns",
      value: sessionsWithTyping.toLocaleString(),
      change: `${((sessionsWithTyping / totalSessions) * 100).toFixed(1)}% of total`,
      changeType: "neutral" as const,
      icon: Clock,
      description: "Sessions with typing data"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {stat.value}
              </div>
              <div className="flex items-center space-x-2">
                <Badge 
                  variant={stat.changeType === "positive" ? "default" : stat.changeType === "negative" ? "destructive" : "secondary"}
                  className="text-xs"
                >
                  {stat.change}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
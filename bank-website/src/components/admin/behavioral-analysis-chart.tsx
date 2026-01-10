"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Activity,
  Target,
  Smartphone,
  AlertTriangle,
  Shield,
  TrendingUp,
  Clock,
  Zap
} from "lucide-react";
import { BehavioralSession } from "@/data-testing";
import { formatDistanceToNow } from "date-fns";

interface BehavioralAnalysisChartProps {
  sessions: BehavioralSession[];
  showRiskAnalysis?: boolean;
  compact?: boolean;
  title?: string;
}

export function BehavioralAnalysisChart({
  sessions,
  showRiskAnalysis = true,
  compact = false,
  title = "Behavioral Analysis"
}: BehavioralAnalysisChartProps) {

  // Calculate behavioral metrics
  const calculateMetrics = () => {
    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        avgTouchPatterns: 0,
        avgKeystrokePatterns: 0,
        avgSessionDuration: 0,
        riskScore: 0,
        anomalies: [],
        deviceTypes: {},
        recentActivity: null
      };
    }

    let totalTouchPatterns = 0;
    let totalKeystrokePatterns = 0;
    let totalDuration = 0;
    let riskFactors = 0;
    const anomalies: string[] = [];
    const deviceTypes: Record<string, number> = {};

    sessions.forEach(session => {
      // Count patterns
      const touchCount = session.touchPatterns?.length || 0;
      const keystrokeCount = session.typingPatterns?.length || 0;

      totalTouchPatterns += touchCount;
      totalKeystrokePatterns += keystrokeCount;

      // Session duration
      if (session.loginBehavior?.sessionDuration) {
        totalDuration += session.loginBehavior.sessionDuration;
      }

      // Device tracking
      const deviceType = 'Unknown'; // Device type not available in current interface
      deviceTypes[deviceType] = (deviceTypes[deviceType] || 0) + 1;

      // Risk analysis
      if (session.touchPatterns) {
        session.touchPatterns.forEach((pattern: any) => {
          if (pattern.hesitationCount > 5) {
            riskFactors += 2;
            if (!anomalies.includes('High hesitation patterns')) {
              anomalies.push('High hesitation patterns');
            }
          }
          if (pattern.isRapidTouch) {
            riskFactors += 1;
            if (!anomalies.includes('Rapid touch detected')) {
              anomalies.push('Rapid touch detected');
            }
          }
          if (pattern.pressure > 0.9 || pattern.pressure < 0.1) {
            riskFactors += 1;
            if (!anomalies.includes('Unusual pressure patterns')) {
              anomalies.push('Unusual pressure patterns');
            }
          }
        });
      }
    });

    const avgTouchPatterns = totalTouchPatterns / sessions.length;
    const avgKeystrokePatterns = totalKeystrokePatterns / sessions.length;
    const avgSessionDuration = totalDuration / sessions.length;
    const riskScore = Math.min(Math.round((riskFactors / sessions.length) * 10), 100);

    // Most recent session
    const recentActivity = sessions.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];

    return {
      totalSessions: sessions.length,
      avgTouchPatterns: Math.round(avgTouchPatterns * 10) / 10,
      avgKeystrokePatterns: Math.round(avgKeystrokePatterns * 10) / 10,
      avgSessionDuration: Math.round(avgSessionDuration / 1000), // Convert to seconds
      riskScore,
      anomalies,
      deviceTypes,
      recentActivity
    };
  };

  const metrics = calculateMetrics();

  const getRiskLevel = (score: number) => {
    if (score >= 70) return { level: 'High', color: 'bg-red-100 text-red-800', bgColor: 'bg-red-500' };
    if (score >= 40) return { level: 'Medium', color: 'bg-yellow-100 text-yellow-800', bgColor: 'bg-yellow-500' };
    return { level: 'Low', color: 'bg-green-100 text-green-800', bgColor: 'bg-green-500' };
  };

  const riskLevel = getRiskLevel(metrics.riskScore);

  if (sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No behavioral data found</p>
            <p className="text-sm text-gray-400">Behavioral analysis will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              {title}
            </div>
            <Badge className={riskLevel.color}>
              {riskLevel.level} Risk
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{metrics.totalSessions}</div>
              <div className="text-sm text-gray-500">Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{metrics.avgTouchPatterns}</div>
              <div className="text-sm text-gray-500">Avg Touch Patterns</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{metrics.riskScore}%</div>
              <div className="text-sm text-gray-500">Risk Score</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Activity className="h-5 w-5 mr-2" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overview Metrics */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{metrics.totalSessions}</div>
            <div className="text-sm text-gray-500">Total Sessions</div>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Target className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{metrics.avgTouchPatterns}</div>
            <div className="text-sm text-gray-500">Avg Touch Patterns</div>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Zap className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{metrics.avgKeystrokePatterns}</div>
            <div className="text-sm text-gray-500">Avg Keystrokes</div>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-5 w-5 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{metrics.avgSessionDuration}s</div>
            <div className="text-sm text-gray-500">Avg Duration</div>
          </div>
        </div>

        {showRiskAnalysis && (
          <>
            <Separator />

            {/* Risk Analysis */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 flex items-center">
                <Shield className="h-4 w-4 mr-2" />
                Risk Analysis
              </h4>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Overall Risk Score</span>
                    <Badge className={riskLevel.color}>
                      {riskLevel.level} ({metrics.riskScore}%)
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Risk Level</span>
                      <span>{metrics.riskScore}%</span>
                    </div>
                    <Progress value={metrics.riskScore} className="h-2" />
                  </div>
                </div>

                <div className="space-y-3">
                  <h5 className="text-sm font-medium text-gray-700">Detected Anomalies</h5>
                  {metrics.anomalies.length > 0 ? (
                    <div className="space-y-1">
                      {metrics.anomalies.map((anomaly, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <AlertTriangle className="h-3 w-3 text-yellow-500" />
                          <span className="text-xs text-gray-600">{anomaly}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Shield className="h-3 w-3 text-green-500" />
                      <span className="text-xs text-green-600">No anomalies detected</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* Device Information */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 flex items-center">
            <Smartphone className="h-4 w-4 mr-2" />
            Device Usage
          </h4>

          <div className="grid gap-3">
            {Object.entries(metrics.deviceTypes).map(([deviceType, count]) => (
              <div key={deviceType} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex items-center space-x-2">
                  <Smartphone className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium capitalize">{deviceType}</span>
                </div>
                <div className="text-sm text-gray-600">
                  {count} session{count !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        {metrics.recentActivity && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Recent Activity</h4>
              <div className="p-3 bg-gray-50 rounded">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Latest Session</span>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(metrics.recentActivity.timestamp), { addSuffix: true })}
                  </span>
                </div>
                <div className="grid gap-2 md:grid-cols-3 text-xs text-gray-600">
                  <div>Touch Patterns: {metrics.recentActivity.touchPatterns?.length || 0}</div>
                  <div>Keystrokes: {metrics.recentActivity.typingPatterns?.length || 0}</div>
                  <div>Duration: {metrics.recentActivity.loginBehavior?.sessionDuration ? Math.round(metrics.recentActivity.loginBehavior.sessionDuration / 1000) : 0}s</div>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
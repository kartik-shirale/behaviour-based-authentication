import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getBehavioralSessionById, getUserById } from "@/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Activity, User, Smartphone, Clock, Target, TrendingUp, AlertTriangle, Shield } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface BehavioralSessionDetailPageProps {
  params: {
    id: string;
  };
}

export default async function BehavioralSessionDetailPage({ params }: BehavioralSessionDetailPageProps) {
  const { id } = params;

  const session = await getBehavioralSessionById(id);

  if (!session) {
    notFound();
  }

  // Fetch related user data
  const user = session.userId ? await getUserById(session.userId) : null;

  // Calculate behavioral metrics
  const touchPatterns = session.touchPatterns || [];
  const keystrokePatterns = session.keystrokePatterns || [];
  const deviceInfo = session.deviceInfo || {};

  const avgPressure = touchPatterns.length > 0
    ? touchPatterns.reduce((sum: number, pattern: any) => sum + (pattern.pressure || 0), 0) / touchPatterns.length
    : 0;

  const avgTouchArea = touchPatterns.length > 0
    ? touchPatterns.reduce((sum: number, pattern: any) => sum + (pattern.touchArea || 0), 0) / touchPatterns.length
    : 0;

  const avgVelocity = touchPatterns.length > 0
    ? touchPatterns.reduce((sum: number, pattern: any) => sum + (pattern.velocity || 0), 0) / touchPatterns.length
    : 0;

  const getRiskLevel = (session: any) => {
    let riskScore = 0;

    // Check for suspicious patterns
    if (touchPatterns.some((p: any) => p.hesitationCount > 5)) riskScore += 2;
    if (touchPatterns.some((p: any) => p.isRapidTouch)) riskScore += 1;
    if (avgPressure > 0.9 || avgPressure < 0.1) riskScore += 1;
    if (avgVelocity > 500) riskScore += 2;

    if (riskScore >= 4) return { level: 'High', color: 'bg-red-100 text-red-800', score: riskScore };
    if (riskScore >= 2) return { level: 'Medium', color: 'bg-yellow-100 text-yellow-800', score: riskScore };
    return { level: 'Low', color: 'bg-green-100 text-green-800', score: riskScore };
  };

  const riskAssessment = getRiskLevel(session);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/admin/behavioral-sessions">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sessions
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Behavioral Session Details</h1>
            <p className="text-muted-foreground">Session ID: {session.sessionId}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={riskAssessment.color}>
            {riskAssessment.level} Risk
          </Badge>
        </div>
      </div>

      {/* Session Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Session Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Session Duration</p>
              <p className="text-lg font-semibold">
                {session.sessionDuration ? `${Math.round(session.sessionDuration / 1000)}s` : 'N/A'}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Touch Patterns</p>
              <p className="text-lg font-semibold">{touchPatterns.length}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Keystroke Patterns</p>
              <p className="text-lg font-semibold">{keystrokePatterns.length}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Risk Score</p>
              <p className="text-lg font-semibold">{riskAssessment.score}/10</p>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Session Start</p>
              <p className="text-sm">
                {new Date(session.timestamp).toLocaleString()}
                <span className="text-muted-foreground ml-2">
                  ({formatDistanceToNow(new Date(session.timestamp), { addSuffix: true })})
                </span>
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Device Type</p>
              <p className="text-sm">{deviceInfo.deviceType || 'Unknown'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Information */}
      {user && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Associated User
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="font-medium text-lg">{user.fullName}</p>
                <p className="text-sm text-muted-foreground">{user.emailId}</p>
                <div className="flex items-center space-x-4 text-sm">
                  <span>Mobile: {user.mobile}</span>
                  <span>Account: {user.accountNumber}</span>
                  <Badge variant={user.isActive ? 'default' : 'secondary'}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              <Link href={`/admin/users/${user.id}`}>
                <Button variant="outline">
                  View User Profile
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Behavioral Analysis */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Touch Patterns Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Touch Patterns Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Average Pressure</span>
                  <span>{avgPressure.toFixed(2)}</span>
                </div>
                <Progress value={avgPressure * 100} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Average Touch Area</span>
                  <span>{avgTouchArea.toFixed(1)}px</span>
                </div>
                <Progress value={Math.min(avgTouchArea / 50 * 100, 100)} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Average Velocity</span>
                  <span>{avgVelocity.toFixed(1)}px/s</span>
                </div>
                <Progress value={Math.min(avgVelocity / 1000 * 100, 100)} className="h-2" />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="font-medium">Pattern Breakdown</h4>
              {touchPatterns.slice(0, 5).map((pattern: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <span className="text-sm font-medium">{pattern.gestureType}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {pattern.coordinates?.length || 0} points
                    </span>
                  </div>
                  <div className="text-right text-xs">
                    <div>Pressure: {pattern.pressure?.toFixed(2) || 'N/A'}</div>
                    <div>Duration: {((pattern.endTime - pattern.startTime) / 1000).toFixed(2)}s</div>
                  </div>
                </div>
              ))}
              {touchPatterns.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{touchPatterns.length - 5} more patterns
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Device & Environment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Smartphone className="h-5 w-5 mr-2" />
              Device & Environment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Device Type:</span>
                <span className="text-sm">{deviceInfo.deviceType || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">OS Version:</span>
                <span className="text-sm">{deviceInfo.osVersion || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Screen Size:</span>
                <span className="text-sm">
                  {deviceInfo.screenWidth && deviceInfo.screenHeight
                    ? `${deviceInfo.screenWidth}x${deviceInfo.screenHeight}`
                    : 'Unknown'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">App Version:</span>
                <span className="text-sm">{deviceInfo.appVersion || 'Unknown'}</span>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium mb-2">Environmental Factors</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Network Type:</span>
                  <span className="text-sm">{deviceInfo.networkType || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Battery Level:</span>
                  <span className="text-sm">
                    {deviceInfo.batteryLevel ? `${deviceInfo.batteryLevel}%` : 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Orientation:</span>
                  <span className="text-sm">{deviceInfo.orientation || 'Unknown'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Risk Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Overall Risk Level</p>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${riskAssessment.level === 'High' ? 'bg-red-500' :
                    riskAssessment.level === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                <span className="font-medium">{riskAssessment.level}</span>
                <span className="text-sm text-muted-foreground">({riskAssessment.score}/10)</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Behavioral Anomalies</p>
              <div className="space-y-1">
                {touchPatterns.some((p: any) => p.hesitationCount > 5) && (
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-3 w-3 text-yellow-500" />
                    <span className="text-xs text-yellow-600">High hesitation detected</span>
                  </div>
                )}
                {touchPatterns.some((p: any) => p.isRapidTouch) && (
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-3 w-3 text-yellow-500" />
                    <span className="text-xs text-yellow-600">Rapid touch patterns</span>
                  </div>
                )}
                {(avgPressure > 0.9 || avgPressure < 0.1) && (
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-3 w-3 text-yellow-500" />
                    <span className="text-xs text-yellow-600">Unusual pressure patterns</span>
                  </div>
                )}
                {avgVelocity > 500 && (
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-3 w-3 text-red-500" />
                    <span className="text-xs text-red-600">Extremely high velocity</span>
                  </div>
                )}
                {riskAssessment.score === 0 && (
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    <span className="text-xs text-green-600">Normal behavioral patterns</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Recommendation</p>
              <Badge variant={riskAssessment.level === 'High' ? 'destructive' :
                riskAssessment.level === 'Medium' ? 'default' : 'secondary'}>
                {riskAssessment.level === 'High' ? 'Requires Review' :
                  riskAssessment.level === 'Medium' ? 'Monitor Closely' : 'Normal Activity'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technical Details */}
      <Card>
        <CardHeader>
          <CardTitle>Technical Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Session ID</p>
                <p className="text-sm font-mono">{session.id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Internal Session ID</p>
                <p className="text-sm font-mono">{session.sessionId}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">User ID</p>
                <p className="text-sm font-mono">{session.userId || 'N/A'}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Timestamp</p>
                <p className="text-sm">{new Date(session.timestamp).toISOString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data Points Collected</p>
                <p className="text-sm">{touchPatterns.length + keystrokePatterns.length}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Loading component
export function BehavioralSessionDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-9 w-32" />
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48 mt-2" />
          </div>
        </div>
        <Skeleton className="h-6 w-20" />
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[...Array(5)].map((_, j) => (
                <Skeleton key={j} className="h-4 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
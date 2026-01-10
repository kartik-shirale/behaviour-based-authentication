"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Activity, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import Link from "next/link";
import { subscribeToUserBehavioralProfiles } from "@/services/firebase";
import { useStore } from "@/store/useStore";
import { UserBehavioralProfile } from "../../../data-testing";

interface ProfileWithId extends UserBehavioralProfile {
  id: string;
}

export default function MonitoringPage() {
  const [profiles, setProfiles] = useState<ProfileWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const { setUserBehavioralProfiles } = useStore();

  useEffect(() => {
    const unsubscribe = subscribeToUserBehavioralProfiles((data) => {
      const profilesData = data as ProfileWithId[];
      setProfiles(profilesData);
      setUserBehavioralProfiles(profilesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUserBehavioralProfiles]);

  const getRiskLevel = (score: number) => {
    if (score < 0.3) return { level: "Low", color: "bg-green-500", textColor: "text-green-700" };
    if (score < 0.7) return { level: "Medium", color: "bg-yellow-500", textColor: "text-yellow-700" };
    return { level: "High", color: "bg-red-500", textColor: "text-red-700" };
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading behavioral profiles...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Behavioral Monitoring Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Real-time monitoring of user behavioral profiles and risk assessments
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Profiles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profiles.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">High Risk</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {profiles.filter(p => p.riskProfile?.avgRiskScore >= 0.7).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Medium Risk</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {profiles.filter(p => p.riskProfile?.avgRiskScore >= 0.3 && p.riskProfile?.avgRiskScore < 0.7).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Low Risk</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {profiles.filter(p => p.riskProfile?.avgRiskScore < 0.3).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Profiles List */}
        <div className="space-y-6">
          {profiles.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">No Behavioral Profiles Found</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Behavioral profiles will appear here once users start interacting with the mobile application.
                </p>
              </CardContent>
            </Card>
          ) : (
            profiles.map((profile) => {
              const riskInfo = getRiskLevel(profile.riskProfile?.avgRiskScore || 0);

              return (
                <Card key={profile.id} className="overflow-hidden">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          User ID: {profile.userId}
                          <Badge className={riskInfo.textColor}>
                            {riskInfo.level} Risk
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          Profile Version: {profile.profileVersion} |
                          Last Updated: {formatTimestamp(profile.lastUpdated)}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Risk Score
                        </div>
                        <div className="text-2xl font-bold">
                          {((profile.riskProfile?.avgRiskScore || 0) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="overview" className="w-full">
                      <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="touch">Touch</TabsTrigger>
                        <TabsTrigger value="typing">Typing</TabsTrigger>
                        <TabsTrigger value="login">Login</TabsTrigger>
                        <TabsTrigger value="risk">Risk</TabsTrigger>
                      </TabsList>

                      <TabsContent value="overview" className="space-y-4">
                        <div className="grid md:grid-cols-3 gap-4">
                          <div>
                            <h4 className="font-semibold mb-2">Data Quality</h4>
                            <Progress value={(profile.profileMetadata?.dataQuality || 0) * 100} className="mb-1" />
                            <p className="text-sm text-gray-600">
                              {((profile.profileMetadata?.dataQuality || 0) * 100).toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-2">Confidence Level</h4>
                            <Progress value={(profile.profileMetadata?.confidenceLevel || 0) * 100} className="mb-1" />
                            <p className="text-sm text-gray-600">
                              {((profile.profileMetadata?.confidenceLevel || 0) * 100).toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-2">Profile Completeness</h4>
                            <Progress value={(profile.profileMetadata?.profileCompleteness || 0) * 100} className="mb-1" />
                            <p className="text-sm text-gray-600">
                              {((profile.profileMetadata?.profileCompleteness || 0) * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-semibold mb-2">Session Statistics</h4>
                            <div className="space-y-1 text-sm">
                              <p>Total Sessions: {profile.profileMetadata?.totalSessions || 0}</p>
                              <p>Data Points: {profile.dataPoints || 0}</p>
                              <p>Touch Sessions: {profile.profileMetadata?.touchDataSessions || 0}</p>
                              <p>Typing Sessions: {profile.profileMetadata?.typingDataSessions || 0}</p>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-2">Behavioral Consistency</h4>
                            <div className="space-y-1 text-sm">
                              <p>Behavior Score: {((profile.overallStats?.behaviorConsistencyScore || 0) * 100).toFixed(1)}%</p>
                              <p>Temporal Score: {((profile.overallStats?.temporalConsistencyScore || 0) * 100).toFixed(1)}%</p>
                              <p>Spatial Score: {((profile.overallStats?.spatialConsistencyScore || 0) * 100).toFixed(1)}%</p>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="touch" className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-semibold mb-2">Pressure Patterns</h4>
                            <div className="space-y-1 text-sm">
                              <p>Avg Pressure: {profile.touchProfile?.avgPressure?.toFixed(3) || 'N/A'}</p>
                              <p>Consistency: {profile.touchProfile?.pressureConsistency?.toFixed(3) || 'N/A'}</p>
                              <p>Range: {profile.touchProfile?.pressureRange?.min?.toFixed(3) || 'N/A'} - {profile.touchProfile?.pressureRange?.max?.toFixed(3) || 'N/A'}</p>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-2">Touch Area</h4>
                            <div className="space-y-1 text-sm">
                              <p>Avg Area: {profile.touchProfile?.avgTouchArea?.toFixed(1) || 'N/A'} px</p>
                              <p>Consistency: {profile.touchProfile?.areaConsistency?.toFixed(3) || 'N/A'}</p>
                              <p>Range: {profile.touchProfile?.areaRange?.min?.toFixed(1) || 'N/A'} - {profile.touchProfile?.areaRange?.max?.toFixed(1) || 'N/A'} px</p>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-2">Gesture Timing</h4>
                            <div className="space-y-1 text-sm">
                              <p>Avg Duration: {profile.touchProfile?.avgGestureDuration?.toFixed(0) || 'N/A'} ms</p>
                              <p>Timing Variation: {profile.touchProfile?.timingVariation?.toFixed(3) || 'N/A'}</p>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-2">Movement Patterns</h4>
                            <div className="space-y-1 text-sm">
                              <p>Avg Swipe Velocity: {profile.touchProfile?.avgSwipeVelocity?.toFixed(1) || 'N/A'} px/s</p>
                              <p>Swipe Accuracy: {((profile.touchProfile?.swipeAccuracy || 0) * 100).toFixed(1)}%</p>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="typing" className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-semibold mb-2">Timing Patterns</h4>
                            <div className="space-y-1 text-sm">
                              <p>Avg Dwell Time: {profile.typingProfile?.avgDwellTime?.toFixed(0) || 'N/A'} ms</p>
                              <p>Avg Flight Time: {profile.typingProfile?.avgFlightTime?.toFixed(0) || 'N/A'} ms</p>
                              <p>Typing Speed: {profile.typingProfile?.avgTypingSpeed?.toFixed(1) || 'N/A'} chars/s</p>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-2">Accuracy & Errors</h4>
                            <div className="space-y-1 text-sm">
                              <p>Touch Accuracy: {((profile.typingProfile?.avgTouchAccuracy || 0) * 100).toFixed(1)}%</p>
                              <p>Error Rate: {((profile.typingProfile?.avgErrorRate || 0) * 100).toFixed(1)}%</p>
                              <p>Correction Speed: {profile.typingProfile?.avgCorrectionSpeed?.toFixed(0) || 'N/A'} ms</p>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-2">Mobile Features</h4>
                            <div className="space-y-1 text-sm">
                              <p>Autocorrect Usage: {((profile.typingProfile?.avgAutocorrectUsage || 0) * 100).toFixed(1)}%</p>
                              <p>Predictive Text: {((profile.typingProfile?.avgPredictiveTextUsage || 0) * 100).toFixed(1)}%</p>
                              <p>Long Pauses: {profile.typingProfile?.avgLongPauseCount || 0}</p>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="login" className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-semibold mb-2">Login Patterns</h4>
                            <div className="space-y-1 text-sm">
                              <p>Daily Logins: {profile.loginProfile?.avgDailyLogins?.toFixed(1) || 'N/A'}</p>
                              <p>Weekly Logins: {profile.loginProfile?.avgWeeklyLogins?.toFixed(1) || 'N/A'}</p>
                              <p>Session Duration: {profile.loginProfile?.avgSessionDuration?.toFixed(0) || 'N/A'} ms</p>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-2">Authentication</h4>
                            <div className="space-y-1 text-sm">
                              <p>Preferred Method: {profile.loginProfile?.preferredAuthMethod || 'N/A'}</p>
                              <p>Auth Success Rate: {((profile.loginProfile?.authSuccessRate || 0) * 100).toFixed(1)}%</p>
                              <p>Biometric Success: {((profile.loginProfile?.biometricSuccessRate || 0) * 100).toFixed(1)}%</p>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="risk" className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-semibold mb-2">Risk Metrics</h4>
                            <div className="space-y-1 text-sm">
                              <p>Baseline Risk: {((profile.riskProfile?.baselineRiskScore || 0) * 100).toFixed(1)}%</p>
                              <p>Average Risk: {((profile.riskProfile?.avgRiskScore || 0) * 100).toFixed(1)}%</p>
                              <p>Anomaly Score: {((profile.riskProfile?.avgAnomalyScore || 0) * 100).toFixed(1)}%</p>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-2">Behavior Analysis</h4>
                            <div className="space-y-1 text-sm">
                              <p>Behavior Drift: {((profile.overallStats?.behaviorDriftScore || 0) * 100).toFixed(1)}%</p>
                              <p>Anomaly Frequency: {profile.riskProfile?.anomalyFrequency?.toFixed(3) || 'N/A'}</p>
                              <p>False Positive Rate: {((profile.riskProfile?.falsePositiveRate || 0) * 100).toFixed(1)}%</p>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Risk Assessment</h4>
                          <div className="flex items-center gap-2 mb-2">
                            {riskInfo.level === 'Low' && <CheckCircle className="h-5 w-5 text-green-600" />}
                            {riskInfo.level === 'Medium' && <Clock className="h-5 w-5 text-yellow-600" />}
                            {riskInfo.level === 'High' && <AlertTriangle className="h-5 w-5 text-red-600" />}
                            <span className={`font-semibold ${riskInfo.textColor}`}>
                              {riskInfo.level} Risk Level
                            </span>
                          </div>
                          <Progress
                            value={(profile.riskProfile?.avgRiskScore || 0) * 100}
                            className="mb-2"
                          />
                          <p className="text-sm text-gray-600">
                            Risk Score: {((profile.riskProfile?.avgRiskScore || 0) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
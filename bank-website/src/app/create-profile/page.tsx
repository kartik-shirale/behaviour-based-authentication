"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, Brain, Zap } from "lucide-react";
import Link from "next/link";
import { addUserBehavioralProfile } from "@/services/firebase";
import { useStore } from "@/store/useStore";
import { toast } from "sonner";
import { UserBehavioralProfile } from "../../../data-testing";

export default function CreateProfilePage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState("");
  const router = useRouter();
  const { addUserBehavioralProfile: addProfileToStore } = useStore();

  const generateSampleProfile = (userId: string): UserBehavioralProfile => {
    const now = Date.now();

    return {
      userId,
      profileVersion: 1,
      lastUpdated: now,
      dataPoints: Math.floor(Math.random() * 100) + 50,

      touchProfile: {
        avgPressure: Math.random() * 0.5 + 0.3,
        pressureConsistency: Math.random() * 0.3 + 0.7,
        pressureRange: { min: 0.1, max: 0.9 },
        avgTouchArea: Math.random() * 50 + 100,
        areaConsistency: Math.random() * 0.3 + 0.6,
        areaRange: { min: 80, max: 200 },
        avgGestureDuration: Math.random() * 200 + 150,
        timingVariation: Math.random() * 0.4 + 0.1,
        durationRange: { min: 100, max: 500 },
        avgSwipeVelocity: Math.random() * 300 + 200,
        swipeAccuracy: Math.random() * 0.3 + 0.7,
        velocityRange: { min: 150, max: 600 },
        avgHesitationCount: Math.random() * 5,
        avgRapidTouchCount: Math.random() * 3,
        gestureFrequency: {
          tap: Math.random() * 0.3 + 0.5,
          swipe: Math.random() * 0.2 + 0.2,
          scroll: Math.random() * 0.2 + 0.1,
          pinch: Math.random() * 0.1,
          long_press: Math.random() * 0.1
        }
      },

      typingProfile: {
        avgDwellTime: Math.random() * 50 + 80,
        dwellTimeConsistency: Math.random() * 0.3 + 0.6,
        avgFlightTime: Math.random() * 100 + 150,
        flightTimeConsistency: Math.random() * 0.3 + 0.5,
        avgTypingSpeed: Math.random() * 3 + 2,
        speedVariation: Math.random() * 0.4 + 0.2,
        speedRange: { min: 1.5, max: 6 },
        avgTouchAccuracy: Math.random() * 0.2 + 0.8,
        accuracyConsistency: Math.random() * 0.3 + 0.7,
        avgErrorRate: Math.random() * 0.1 + 0.02,
        avgCorrectionSpeed: Math.random() * 500 + 800,
        errorPatternConsistency: Math.random() * 0.4 + 0.5,
        avgAutocorrectUsage: Math.random() * 0.4 + 0.3,
        avgPredictiveTextUsage: Math.random() * 0.5 + 0.2,
        avgLongPauseCount: Math.random() * 3 + 1,
        inputTypePerformance: {
          password: { speed: 2.1, accuracy: 0.95, errorRate: 0.03 },
          email: { speed: 3.2, accuracy: 0.92, errorRate: 0.05 },
          amount: { speed: 1.8, accuracy: 0.98, errorRate: 0.01 },
          text: { speed: 3.5, accuracy: 0.88, errorRate: 0.08 }
        }
      },

      loginProfile: {
        preferredLoginTimes: [9, 14, 20],
        avgSessionDuration: Math.random() * 300000 + 180000,
        avgSessionDepth: Math.random() * 10 + 5,
        avgIdleTime: Math.random() * 60000 + 30000,
        preferredAuthMethod: ["pin", "biometric", "otp"][Math.floor(Math.random() * 3)],
        avgAuthAttempts: Math.random() * 2 + 1,
        authSuccessRate: Math.random() * 0.1 + 0.9,
        fallbackUsageRate: Math.random() * 0.2,
        biometricSuccessRate: Math.random() * 0.15 + 0.85,
        preferredBiometricType: ["fingerprint", "face_id"][Math.floor(Math.random() * 2)],
        avgDailyLogins: Math.random() * 5 + 2,
        avgWeeklyLogins: Math.random() * 20 + 15,
        loginConsistency: Math.random() * 0.3 + 0.7
      },

      locationProfile: {
        homeLocation: { city: "Sample City", country: "Sample Country", frequency: 0.7 },
        workLocation: { city: "Work City", country: "Sample Country", frequency: 0.2 },
        frequentCities: [
          { city: "Sample City", visitCount: 150, lastVisit: now - 86400000 },
          { city: "Work City", visitCount: 80, lastVisit: now - 172800000 }
        ],
        avgTravelDistance: Math.random() * 50 + 10,
        maxTravelDistance: Math.random() * 200 + 100,
        avgLocationAccuracy: Math.random() * 20 + 5,
        vpnUsageRate: Math.random() * 0.1,
        highRiskLocationRate: Math.random() * 0.05,
        locationSpoofingIncidents: Math.floor(Math.random() * 3)
      },

      networkProfile: {
        preferredNetworkType: ["wifi", "cellular"][Math.floor(Math.random() * 2)],
        knownNetworks: [
          { name: "Home WiFi", usageCount: 200, lastUsed: now - 3600000 },
          { name: "Office WiFi", usageCount: 120, lastUsed: now - 86400000 }
        ],
        avgBandwidth: Math.random() * 50 + 25,
        avgLatency: Math.random() * 50 + 20,
        avgPacketLoss: Math.random() * 2,
        connectionStabilityScore: Math.random() * 0.2 + 0.8,
        publicNetworkUsageRate: Math.random() * 0.3,
        vpnUsageRate: Math.random() * 0.1,
        secureConnectionRate: Math.random() * 0.1 + 0.9
      },

      deviceProfile: {
        primaryDevices: [
          { deviceId: "device_001", model: "iPhone 14", usageRate: 0.8 },
          { deviceId: "device_002", model: "Samsung Galaxy S23", usageRate: 0.2 }
        ],
        avgBatteryLevel: Math.random() * 40 + 40,
        preferredOrientation: ["portrait", "landscape"][Math.floor(Math.random() * 2)],
        avgScreenBrightness: Math.random() * 0.4 + 0.4,
        topApps: [
          { appName: "Banking App", avgUsageTime: 1800 },
          { appName: "Social Media", avgUsageTime: 3600 }
        ],
        avgMotionActivity: Math.random() * 0.5 + 0.3,
        motionConsistency: Math.random() * 0.3 + 0.6,
        securityIncidents: Math.floor(Math.random() * 2),
        rootingDetectionCount: Math.floor(Math.random() * 1)
      },

      overallStats: {
        avgSessionsPerDay: Math.random() * 5 + 3,
        avgSessionsPerWeek: Math.random() * 20 + 15,
        peakActivityHours: [9, 14, 20],
        peakActivityDays: [1, 2, 3, 4, 5],
        behaviorConsistencyScore: Math.random() * 0.3 + 0.6,
        temporalConsistencyScore: Math.random() * 0.3 + 0.6,
        spatialConsistencyScore: Math.random() * 0.3 + 0.6,
        behaviorDriftScore: Math.random() * 0.3 + 0.1,
        lastSignificantChange: now - Math.random() * 2592000000
      },

      riskProfile: {
        baselineRiskScore: Math.random() * 0.4 + 0.1,
        avgRiskScore: Math.random() * 0.6 + 0.2,
        riskScoreRange: { min: 0.1, max: 0.8 },
        frequentRiskFactors: [
          { factor: "unusual_timing", frequency: 0.1 },
          { factor: "location_anomaly", frequency: 0.05 }
        ],
        rareRiskFactors: [
          { factor: "device_change", lastOccurrence: now - 1209600000 }
        ],
        avgAnomalyScore: Math.random() * 0.3 + 0.1,
        anomalyFrequency: Math.random() * 0.1 + 0.02,
        falsePositiveRate: Math.random() * 0.1 + 0.05
      },

      profileMetadata: {
        dataQuality: Math.random() * 0.2 + 0.8,
        confidenceLevel: Math.random() * 0.3 + 0.7,
        profileCompleteness: Math.random() * 0.2 + 0.8,
        totalSessions: Math.floor(Math.random() * 200) + 100,
        lastProfileUpdate: now,
        nextScheduledUpdate: now + 86400000,
        touchDataSessions: Math.floor(Math.random() * 150) + 80,
        typingDataSessions: Math.floor(Math.random() * 120) + 60,
        locationDataSessions: Math.floor(Math.random() * 180) + 90,
        networkDataSessions: Math.floor(Math.random() * 160) + 85
      }
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) {
      toast.error("Please enter a user ID");
      return;
    }

    setIsSubmitting(true);
    try {
      const sampleProfile = generateSampleProfile(userId.trim());
      const newProfile = await addUserBehavioralProfile(sampleProfile);
      addProfileToStore(newProfile as any);
      toast.success("Sample behavioral profile created successfully!");
      router.push("/monitoring");
    } catch (error) {
      console.error("Error creating profile:", error);
      toast.error("Failed to create profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>

        <div className="space-y-8">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Brain className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Create Behavioral Profile</h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Generate a comprehensive behavioral profile for fraud detection testing and analysis
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Profile Generation
              </CardTitle>
              <CardDescription>
                This will create a sample behavioral profile with realistic patterns for testing the monitoring dashboard.
                In production, these profiles are automatically generated from mobile app interactions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="userId" className="text-sm font-medium">User ID</Label>
                  <Input
                    id="userId"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="Enter user ID (e.g., user_001)"
                    required
                    className="h-11"
                  />
                  <p className="text-sm text-muted-foreground">
                    This should match a user ID from the registered users
                  </p>
                </div>

                <div className="bg-muted/50 border border-border/50 p-6 rounded-lg space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="h-5 w-5 text-primary" />
                    <h4 className="font-semibold">Generated Profile Components</h4>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span>Touch behavior patterns</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span>Typing speed & accuracy</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span>Login behavior analysis</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span>Location & network patterns</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span>Device usage statistics</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span>Risk assessment scores</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button type="submit" disabled={isSubmitting} className="flex-1 h-12">
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Creating Profile...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Sample Profile
                      </>
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => router.push("/")} className="h-12">
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Activity, Clock, Smartphone, Wifi } from "lucide-react";
import Link from "next/link";
import { subscribeToAllBehavioralSessions, addBehavioralSession } from "@/services/firebase";
import { useStore } from "@/store/useStore";
import { toast } from "sonner";
import { BehavioralSession } from "../../../data-testing";

export default function SessionsPage() {
  const { behavioralSessions, setBehavioralSessions, addBehavioralSession: addSessionToStore } = useStore();
  const [userId, setUserId] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAllBehavioralSessions((sessions) => {
      setBehavioralSessions(sessions as BehavioralSession[]);
    });

    return () => unsubscribe();
  }, [setBehavioralSessions]);

  const createSampleSession = async () => {
    if (!userId.trim()) {
      toast.error("Please enter a User ID");
      return;
    }

    setIsCreating(true);
    try {
      const sampleSession: BehavioralSession = {
        sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: userId.trim(),
        timestamp: Date.now(),
        touchPatterns: [
          {
            sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId: userId.trim(),
            touches: [
              {
                gestureType: "tap",
                timestamp: Date.now() - 1000,
                startX: 150 + Math.random() * 50,
                startY: 300 + Math.random() * 50,
                endX: 150 + Math.random() * 50,
                endY: 300 + Math.random() * 50,
                duration: 100 + Math.random() * 50,
                pressure: 0.6 + Math.random() * 0.3,
                touchArea: 15 + Math.random() * 10,
                distance: 0,
                velocity: 0
              }
            ],
            avgPressure: 0.6 + Math.random() * 0.3,
            pressureConsistency: 0.8 + Math.random() * 0.2,
            avgTouchArea: 15 + Math.random() * 10,
            areaConsistency: 0.7 + Math.random() * 0.3,
            avgGestureDuration: 100 + Math.random() * 50,
            timingVariation: 0.2 + Math.random() * 0.3,
            avgSwipeVelocity: 0,
            swipeAccuracy: 0.9 + Math.random() * 0.1,
            hesitationCount: Math.floor(Math.random() * 3),
            rapidTouchCount: Math.floor(Math.random() * 2),
            totalGestures: 1,
            sessionDuration: 1000 + Math.random() * 2000,
            timestamp: Date.now(),
            riskScore: Math.random() * 0.3
          }
        ],
        typingPatterns: [
          {
            sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId: userId.trim(),
            inputType: "password",
            keystrokes: [
              {
                character: "p",
                dwellTime: 120 + Math.random() * 50,
                flightTime: 80 + Math.random() * 40,
                pressure: 0.7 + Math.random() * 0.2,
                x: 150 + Math.random() * 50,
                y: 300 + Math.random() * 50,
                timestamp: Date.now() - 3000
              }
            ],
            avgDwellTime: 120 + Math.random() * 50,
             avgFlightTime: 80 + Math.random() * 40,
             timingConsistency: 0.8 + Math.random() * 0.2,
             typingSpeed: 2.5 + Math.random() * 1.5,
             avgPressure: 0.7 + Math.random() * 0.2,
             pressureVariation: 0.1 + Math.random() * 0.1,
             touchAccuracy: 0.9 + Math.random() * 0.1,
             errorRate: Math.random() * 0.1,
             correctionSpeed: 1.2 + Math.random() * 0.8,
             autocorrectUsage: Math.random(),
             predictiveTextUsage: Math.random(),
             longPauseCount: Math.floor(Math.random() * 3),
             duration: 1000 + Math.random() * 2000,
             characterCount: 1,
             timestamp: Date.now()
          }
        ],
        loginBehavior: {
          timestamp: Date.now(),
          timeOfDay: new Date().getHours(),
          dayOfWeek: new Date().getDay(),
          dayOfMonth: new Date().getDate(),
          weekOfYear: Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)),
          loginFrequency: 2 + Math.random() * 3,
          sessionDuration: 300 + Math.random() * 600,
          sessionDepth: 5 + Math.floor(Math.random() * 10),
          sessionIdleTime: Math.random() * 60,
          loginFlow: Math.random() > 0.5 ? "biometric" : "pin",
          authAttempts: 1 + Math.floor(Math.random() * 2),
          authFailures: Math.floor(Math.random() * 1),
          fallbackUsed: Math.random() > 0.8,
          biometricOutcome: Math.random() > 0.05 ? "success" : "failure",
          biometricType: "fingerprint",
          hardwareAttestation: Math.random() > 0.5
        },
        motionPattern: [
           {
             sampleRateHz: 50,
             duration: 1000 + Math.random() * 2000,
             samples: [
               {
                  timestamp: Date.now() - 1000,
                  accelerometer: {
                    x: (Math.random() - 0.5) * 2,
                    y: (Math.random() - 0.5) * 2,
                    z: (Math.random() - 0.5) * 2
                  },
                  gyroscope: {
                    x: (Math.random() - 0.5) * 0.5,
                    y: (Math.random() - 0.5) * 0.5,
                    z: (Math.random() - 0.5) * 0.5
                  },
                  magnetometer: {
                    x: (Math.random() - 0.5) * 0.1,
                    y: (Math.random() - 0.5) * 0.1,
                    z: (Math.random() - 0.5) * 0.1
                  }
                }
             ]
           }
         ]
      };

      const newSession = await addBehavioralSession(sampleSession);
      addSessionToStore(newSession as BehavioralSession);
      toast.success("Sample behavioral session created successfully!");
      setUserId("");
    } catch (error) {
      console.error("Error creating session:", error);
      toast.error("Failed to create session. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-800">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>

        <div className="grid gap-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-6 w-6 text-purple-600" />
                Behavioral Sessions
              </CardTitle>
              <CardDescription>
                Real-time behavioral session data from mobile devices
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Create Sample Session */}
          <Card>
            <CardHeader>
              <CardTitle>Create Sample Session</CardTitle>
              <CardDescription>
                Generate a sample behavioral session for testing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label htmlFor="userId">User ID</Label>
                  <Input
                    id="userId"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="Enter user ID"
                  />
                </div>
                <Button onClick={createSampleSession} disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create Session"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sessions List */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Sessions ({behavioralSessions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {behavioralSessions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No behavioral sessions found</p>
                  <p className="text-sm">Create a sample session to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {behavioralSessions.map((session, index) => (
                    <div key={session.sessionId || index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">Session: {session.sessionId}</h3>
                          <p className="text-sm text-gray-600">User: {session.userId}</p>
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimestamp(session.timestamp)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-4 w-4 text-blue-500" />
                          <span>Touch: {session.touchPatterns?.length || 0} gestures</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-green-500" />
                          <span>Typing: {session.typingPatterns?.length || 0} patterns</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Wifi className="h-4 w-4 text-purple-500" />
                          <span>Network: N/A</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-orange-500" />
                          <span>Duration: {Math.round((session.loginBehavior?.sessionDuration || 0) / 60)}m</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 text-xs">
                        <span className="px-2 py-1 rounded bg-gray-100 text-gray-800">
                          Device Status: Unknown
                        </span>
                        <span className="px-2 py-1 rounded bg-gray-100 text-gray-800">
                          Connection: Unknown
                        </span>
                        <span className={`px-2 py-1 rounded ${
                          (session.loginBehavior?.authFailures || 0) === 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {(session.loginBehavior?.authFailures || 0) === 0 ? 'Auth Success' : 'Auth Failed'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
'use client'
import { subscribeToAllBehavioralSessions } from '@/services/firebase';
import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileText } from 'lucide-react';

interface TouchEvent {
  startY: number;
  endY: number;
  velocity: number;
  endX: number;
  startX: number;
  timestamp: number;
  duration: number;
  distance: number;
  gestureType: "tap";
}

interface MotionSample {
  rotationRate: number;
  timestamp: number;
  gyroscope: {
    x: number;
    y: number;
    z: number;
  };
  accelerometer: {
    x: number;
    y: number;
    z: number;
  };
  motionMagnitude: number;
  magnetometer: {
    x: number;
    y: number;
    z: number;
  };
}

interface Keystroke {
  dwellTime: number;
  character: string;
  coordinate_y: number;
  coordinate_x: number;
  timestamp: number;
  flightTime: number;
}

interface TypingPattern {
  keystrokes: Keystroke[];
  inputType: "mobile" | "amount" | "text";
}

const GetData = () => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [touchEvents, setTouchEvents] = useState<TouchEvent[]>([]);
    const [motionSamples, setMotionSamples] = useState<MotionSample[]>([]);
    const [keystrokes, setKeystrokes] = useState<Keystroke[]>([]);

    useEffect(() => {
        const unsubscribe = subscribeToAllBehavioralSessions((sessions) => {
            setData(sessions);
            
            // Extract touch events, motion samples, and keystrokes from all sessions
            const allTouchEvents: TouchEvent[] = [];
            const allMotionSamples: MotionSample[] = [];
            const allKeystrokes: Keystroke[] = [];
            
            sessions.forEach((session) => {
                // Extract touch events
                if (session.touchPatterns && Array.isArray(session.touchPatterns)) {
                    session.touchPatterns.forEach((touchPattern: any) => {
                        if (touchPattern.touches && Array.isArray(touchPattern.touches)) {
                            touchPattern.touches.forEach((touch: any) => {
                                // Map MobileTouchEvent to TouchEvent format
                                if (touch.gestureType === 'tap') {
                                    allTouchEvents.push({
                                        startY: touch.startY || 0,
                                        endY: touch.endY || 0,
                                        velocity: touch.velocity || 0,
                                        endX: touch.endX || 0,
                                        startX: touch.startX || 0,
                                        timestamp: touch.timestamp || 0,
                                        duration: touch.duration || 0,
                                        distance: touch.distance || 0,
                                        gestureType: "tap"
                                    });
                                }
                            });
                        }
                    });
                }
                
                // Extract motion samples
                if (session.motionPattern && Array.isArray(session.motionPattern)) {
                    session.motionPattern.forEach((motionPattern: any) => {
                        if (motionPattern.samples && Array.isArray(motionPattern.samples)) {
                            motionPattern.samples.forEach((sample: any) => {
                                allMotionSamples.push({
                                    rotationRate: sample.rotationRate || 0,
                                    timestamp: sample.timestamp || 0,
                                    gyroscope: {
                                        x: sample.gyroscope?.x || 0,
                                        y: sample.gyroscope?.y || 0,
                                        z: sample.gyroscope?.z || 0
                                    },
                                    accelerometer: {
                                        x: sample.accelerometer?.x || 0,
                                        y: sample.accelerometer?.y || 0,
                                        z: sample.accelerometer?.z || 0
                                    },
                                    motionMagnitude: sample.motionMagnitude || 0,
                                    magnetometer: {
                                        x: sample.magnetometer?.x || 0,
                                        y: sample.magnetometer?.y || 0,
                                        z: sample.magnetometer?.z || 0
                                    }
                                });
                            });
                        }
                    });
                }
                
                // Extract keystrokes from typing patterns
                if (session.typingPatterns && Array.isArray(session.typingPatterns)) {
                    session.typingPatterns.forEach((typingPattern: any) => {
                        if (typingPattern.keystrokes && Array.isArray(typingPattern.keystrokes)) {
                            typingPattern.keystrokes.forEach((keystroke: any) => {
                                allKeystrokes.push({
                                    dwellTime: keystroke.dwellTime || 0,
                                    character: keystroke.character || '',
                                    coordinate_y: keystroke.coordinate_y || 0,
                                    coordinate_x: keystroke.coordinate_x || 0,
                                    timestamp: keystroke.timestamp || 0,
                                    flightTime: keystroke.flightTime || 0
                                });
                            });
                        }
                    });
                }
            });
            
            setTouchEvents(allTouchEvents);
            setMotionSamples(allMotionSamples);
            setKeystrokes(allKeystrokes);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const downloadTouchCSV = () => {
        if (touchEvents.length === 0) {
            alert('No touch events data available to download');
            return;
        }

        // Create CSV header
        const headers = ['distance', 'duration', 'endX', 'endY', 'startX', 'startY', 'velocity'];
        
        // Create CSV content
        const csvContent = [
            headers.join(','),
            ...touchEvents.map(event => [
                event.distance,
                event.duration,
                event.endX,
                event.endY,
                event.startX,
                event.startY,
                event.velocity
            ].join(','))
        ].join('\n');

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `touch_events_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadMotionCSV = () => {
        if (motionSamples.length === 0) {
            alert('No motion data available to download');
            return;
        }

        // Create CSV header
        const headers = ['accel_x', 'accel_y', 'accel_z', 'gyro_x', 'gyro_y', 'gyro_z', 'mag_x', 'mag_y', 'mag_z', 'motion_magnitude', 'rotation_rate'];
        
        // Create CSV content
        const csvContent = [
            headers.join(','),
            ...motionSamples.map(sample => [
                sample.accelerometer.x,
                sample.accelerometer.y,
                sample.accelerometer.z,
                sample.gyroscope.x,
                sample.gyroscope.y,
                sample.gyroscope.z,
                sample.magnetometer.x,
                sample.magnetometer.y,
                sample.magnetometer.z,
                sample.motionMagnitude,
                sample.rotationRate
            ].join(','))
        ].join('\n');

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `motion_data_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadKeystrokesCSV = () => {
        if (keystrokes.length === 0) {
            alert('No keystroke data available to download');
            return;
        }

        // Create CSV header
        const headers = ['character', 'dwellTime', 'flightTime', 'coordinate_x', 'coordinate_y'];
        
        // Create CSV content
        const csvContent = [
            headers.join(','),
            ...keystrokes.map(keystroke => [
                `"${keystroke.character.replace(/"/g, '""')}"`, // Escape quotes in character
                keystroke.dwellTime,
                keystroke.flightTime,
                keystroke.coordinate_x,
                keystroke.coordinate_y
            ].join(','))
        ].join('\n');

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `keystroke_data_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="container mx-auto p-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Touch Events Data Export
                    </CardTitle>
                    <CardDescription>
                        Export touch event data from all behavioral sessions in CSV format
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <h3 className="font-semibold text-blue-900">Total Sessions</h3>
                            <p className="text-2xl font-bold text-blue-600">{data.length}</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                            <h3 className="font-semibold text-green-900">Touch Events</h3>
                            <p className="text-2xl font-bold text-green-600">{touchEvents.length}</p>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg">
                            <h3 className="font-semibold text-orange-900">Motion Samples</h3>
                            <p className="text-2xl font-bold text-orange-600">{motionSamples.length}</p>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg">
                            <h3 className="font-semibold text-red-900">Keystrokes</h3>
                            <p className="text-2xl font-bold text-red-600">{keystrokes.length}</p>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg">
                            <h3 className="font-semibold text-purple-900">Status</h3>
                            <p className="text-sm font-medium text-purple-600">
                                {loading ? 'Loading...' : 'Ready'}
                            </p>
                        </div>
                    </div>
                    
                    <div className="pt-4 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            <Button 
                                onClick={downloadTouchCSV} 
                                disabled={loading || touchEvents.length === 0}
                                className="w-full"
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Touch Events CSV ({touchEvents.length})
                            </Button>
                            <Button 
                                onClick={downloadMotionCSV} 
                                disabled={loading || motionSamples.length === 0}
                                variant="outline"
                                className="w-full"
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Motion Data CSV ({motionSamples.length})
                            </Button>
                            <Button 
                                onClick={downloadKeystrokesCSV} 
                                disabled={loading || keystrokes.length === 0}
                                variant="secondary"
                                className="w-full"
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Keystroke Data CSV ({keystrokes.length})
                            </Button>
                        </div>
                    </div>
                    
                    <div className="space-y-6">
                        {touchEvents.length > 0 && (
                            <div>
                                <h3 className="font-semibold mb-2">Touch Events CSV Format Preview:</h3>
                                <div className="bg-gray-50 p-3 rounded text-sm font-mono overflow-x-auto">
                                    <div className="font-bold">distance,duration,endX,endY,startX,startY,velocity</div>
                                    {touchEvents.slice(0, 3).map((event, index) => (
                                        <div key={index}>
                                            {event.distance},{event.duration},{event.endX},{event.endY},{event.startX},{event.startY},{event.velocity}
                                        </div>
                                    ))}
                                    {touchEvents.length > 3 && <div>... and {touchEvents.length - 3} more records</div>}
                                </div>
                            </div>
                        )}
                        
                        {motionSamples.length > 0 && (
                            <div>
                                <h3 className="font-semibold mb-2">Motion Data CSV Format Preview:</h3>
                                <div className="bg-gray-50 p-3 rounded text-sm font-mono overflow-x-auto">
                                    <div className="font-bold">accel_x,accel_y,accel_z,gyro_x,gyro_y,gyro_z,mag_x,mag_y,mag_z,motion_magnitude,rotation_rate</div>
                                    {motionSamples.slice(0, 3).map((sample, index) => (
                                        <div key={index}>
                                            {sample.accelerometer.x},{sample.accelerometer.y},{sample.accelerometer.z},{sample.gyroscope.x},{sample.gyroscope.y},{sample.gyroscope.z},{sample.magnetometer.x},{sample.magnetometer.y},{sample.magnetometer.z},{sample.motionMagnitude},{sample.rotationRate}
                                        </div>
                                    ))}
                                    {motionSamples.length > 3 && <div>... and {motionSamples.length - 3} more records</div>}
                                </div>
                            </div>
                        )}
                        
                        {keystrokes.length > 0 && (
                            <div>
                                <h3 className="font-semibold mb-2">Keystroke Data CSV Format Preview:</h3>
                                <div className="bg-gray-50 p-3 rounded text-sm font-mono overflow-x-auto">
                                    <div className="font-bold">character,dwellTime,flightTime,coordinate_x,coordinate_y</div>
                                    {keystrokes.slice(0, 3).map((keystroke, index) => (
                                        <div key={index}>
                                            "{keystroke.character}",{keystroke.dwellTime},{keystroke.flightTime},{keystroke.coordinate_x},{keystroke.coordinate_y}
                                        </div>
                                    ))}
                                    {keystrokes.length > 3 && <div>... and {keystrokes.length - 3} more records</div>}
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default GetData
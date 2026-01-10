"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Smartphone, Wifi, Shield, Database } from "lucide-react";
import { BehaviorProfile } from "@/actions/admin";

interface BehaviorProfileCardProps {
  profile: BehaviorProfile | null;
  loading?: boolean;
}

export function BehaviorProfileCard({ profile, loading }: BehaviorProfileCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Behavior Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Behavior Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Database className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Behavior Profile Available</h3>
            <p className="text-muted-foreground">
              No behavioral analysis data has been collected for this user yet.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Behavior Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* SIM Operator */}
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">SIM Operator:</span>
          <Badge variant="outline">{profile.simOperator}</Badge>
        </div>

        {/* Device Fingerprint */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Wifi className="h-4 w-4 text-muted-foreground" />
            Device Fingerprint
          </h4>
          <div className="bg-muted p-3 rounded-md">
            <pre className="text-xs overflow-x-auto">
              {JSON.stringify(profile.DeviceFingerprint, null, 2)}
            </pre>
          </div>
        </div>

        {/* Location Patterns */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            Location Patterns ({profile.locationPatterns.length} locations)
          </h4>
          <div className="space-y-3">
            {profile.locationPatterns.slice(0, 3).map((location, index) => (
              <div key={index} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                  </span>
                  {location.vpnDetected && (
                    <Badge variant="destructive" className="text-xs">
                      VPN Detected
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>Altitude: {location.altitude}m</div>
                  <div>Timezone: {location.timezone}</div>
                  <div className="col-span-2">
                    Timestamp: {new Date(location.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
            {profile.locationPatterns.length > 3 && (
              <p className="text-xs text-muted-foreground text-center">
                +{profile.locationPatterns.length - 3} more locations
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
"use client";

import { Users, UserCheck, UserX, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User } from "@/data-testing";

interface UsersStatsProps {
  users: User[];
}

export function UsersStats({ users }: UsersStatsProps) {
  const totalUsers = users.length;
  const activeUsers = users.filter(user => user.isActive).length;
  const verifiedUsers = users.filter(user => user.isActive).length; // Changed from isVerified to isActive
  const biometricEnabledUsers = users.filter(user => user.biometricEnabled).length;

  const activePercentage = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;
  const verifiedPercentage = totalUsers > 0 ? (verifiedUsers / totalUsers) * 100 : 0;
  const biometricPercentage = totalUsers > 0 ? (biometricEnabledUsers / totalUsers) * 100 : 0;

  const stats = [
    {
      title: "Total Users",
      value: totalUsers.toLocaleString(),
      change: `${activeUsers} active`,
      changeType: "neutral" as const,
      icon: Users,
      description: `${activePercentage.toFixed(1)}% active users`
    },
    {
      title: "Verified Users",
      value: verifiedUsers.toLocaleString(),
      change: `${verifiedPercentage.toFixed(1)}%`,
      changeType: verifiedPercentage >= 80 ? "positive" : "negative" as const,
      icon: UserCheck,
      description: "Account verification rate"
    },
    {
      title: "Biometric Enabled",
      value: biometricEnabledUsers.toLocaleString(),
      change: `${biometricPercentage.toFixed(1)}%`,
      changeType: biometricPercentage >= 60 ? "positive" : "negative" as const,
      icon: Shield,
      description: "Enhanced security adoption"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <p className="text-xs text-gray-500">
                  {stat.description}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
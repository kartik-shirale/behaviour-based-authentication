"use client";

import { Users, CreditCard, Activity, Smartphone, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StatsCardsProps {
  stats: {
    totalUsers: number;
    activeUsers: number;
    totalTransactions: number;
    totalBehavioralSessions: number;
    userGrowth: Array<{ month: string; users: number }>;
    transactionTrends: Array<{ month: string; amount: number; count: number }>;
    appVersions: Array<{ version: string; count: number; percentage: number }>;
    recentUsers: Array<any>;
    recentTransactions: Array<any>;
  };
}

export function StatsCards({ stats }: StatsCardsProps) {
  // Safe calculation with fallback to 0
  const calculateGrowthPercentage = (current: number, previous: number): number => {
    if (!previous || !current || isNaN(current) || isNaN(previous)) return 0;
    return ((current - previous) / previous) * 100;
  };

  const userGrowthPercentage = stats.userGrowth?.length >= 2
    ? calculateGrowthPercentage(
      stats.userGrowth[stats.userGrowth.length - 1]?.users || 0,
      stats.userGrowth[stats.userGrowth.length - 2]?.users || 0
    )
    : 0;

  const transactionGrowthPercentage = stats.transactionTrends?.length >= 2
    ? calculateGrowthPercentage(
      stats.transactionTrends[stats.transactionTrends.length - 1]?.count || 0,
      stats.transactionTrends[stats.transactionTrends.length - 2]?.count || 0
    )
    : 0;

  const activeUserPercentage = stats.totalUsers > 0
    ? (stats.activeUsers / stats.totalUsers) * 100
    : 0;

  const cards = [
    {
      title: "Total Users",
      value: (stats.totalUsers || 0).toLocaleString(),
      change: userGrowthPercentage,
      icon: Users,
      description: `${(stats.activeUsers || 0).toLocaleString()} active (${activeUserPercentage.toFixed(0)}%)`,
    },
    {
      title: "Transactions",
      value: (stats.totalTransactions || 0).toLocaleString(),
      change: transactionGrowthPercentage,
      icon: CreditCard,
      description: "This month",
    },
    {
      title: "Behavioral Sessions",
      value: (stats.totalBehavioralSessions || 0).toLocaleString(),
      change: 12.3,
      icon: Activity,
      description: "Security analysis",
    },
    {
      title: "App Versions",
      value: (stats.appVersions?.length || 0).toString(),
      change: null,
      icon: Smartphone,
      description: stats.appVersions?.[0]?.version || "Latest version",
    }
  ];

  const cardGradient = "from-violet-600 to-violet-700";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const isPositive = card.change !== null && card.change >= 0;
        const showChange = card.change !== null && !isNaN(card.change);

        return (
          <Card key={index} className="relative overflow-hidden border-border/50 hover:border-border hover:shadow-lg transition-all duration-300">
            {/* Gradient accent */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${cardGradient}`} />

            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg bg-gradient-to-br ${cardGradient} shadow-sm`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground mb-2">
                {card.value}
              </div>
              <div className="flex items-center gap-2">
                {showChange && (
                  <Badge
                    variant={isPositive ? "default" : "destructive"}
                    className="text-xs font-medium gap-1"
                  >
                    {isPositive ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {isPositive ? "+" : ""}{card.change.toFixed(1)}%
                  </Badge>
                )}
                <p className="text-xs text-muted-foreground truncate">
                  {card.description}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
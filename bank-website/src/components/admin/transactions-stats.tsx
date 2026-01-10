"use client";

import { CreditCard, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Transaction } from "@/data-testing";

interface TransactionsStatsProps {
  transactions: Transaction[];
}

export function TransactionsStats({ transactions }: TransactionsStatsProps) {
  const totalTransactions = transactions.length;
  const totalVolume = transactions.reduce((sum, t) => sum + t.amount, 0);
  const successfulTransactions = transactions.filter(t => t.status === "completed").length;
  const failedTransactions = transactions.filter(t => t.status === "failed").length;
  const pendingTransactions = transactions.filter(t => t.status === "pending").length;
  
  const successRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0;
  const failureRate = totalTransactions > 0 ? (failedTransactions / totalTransactions) * 100 : 0;
  const averageAmount = totalTransactions > 0 ? totalVolume / totalTransactions : 0;
  
  // Get today's transactions for daily comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.createdAt);
    transactionDate.setHours(0, 0, 0, 0);
    return transactionDate.getTime() === today.getTime();
  });
  const todayVolume = todayTransactions.reduce((sum, t) => sum + t.amount, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const stats = [
    {
      title: "Total Volume",
      value: formatCurrency(totalVolume),
      change: `${formatCurrency(todayVolume)} today`,
      changeType: "neutral" as const,
      icon: CreditCard,
      description: `Avg: ${formatCurrency(averageAmount)}`
    },
    {
      title: "Total Transactions",
      value: totalTransactions.toLocaleString(),
      change: `${todayTransactions.length} today`,
      changeType: "neutral" as const,
      icon: TrendingUp,
      description: "All time transactions"
    },
    {
      title: "Success Rate",
      value: `${successRate.toFixed(1)}%`,
      change: `${successfulTransactions} completed`,
      changeType: successRate >= 95 ? "positive" : successRate >= 85 ? "neutral" : "negative" as const,
      icon: TrendingUp,
      description: "Transaction success rate"
    },
    {
      title: "Failed Transactions",
      value: failedTransactions.toLocaleString(),
      change: `${failureRate.toFixed(1)}% failure rate`,
      changeType: failureRate <= 5 ? "positive" : failureRate <= 15 ? "neutral" : "negative" as const,
      icon: AlertCircle,
      description: `${pendingTransactions} pending`
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
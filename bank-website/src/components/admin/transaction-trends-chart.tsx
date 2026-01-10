"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

import { Transaction } from "@/data-testing";

interface TransactionTrendsChartProps {
  data?: Array<{ month: string; amount: number; count: number }>;
  transactions?: Transaction[];
}

export function TransactionTrendsChart({ data, transactions }: TransactionTrendsChartProps) {
  // Process transactions data if provided instead of data
  const chartData = data || (transactions ? processTransactionsData(transactions) : []);

  function processTransactionsData(transactions: Transaction[]) {
    const monthlyData = new Map<string, { amount: number; count: number }>();

    transactions.forEach(transaction => {
      const date = new Date(transaction.createdAt);
      const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { amount: 0, count: 0 });
      }

      const existing = monthlyData.get(monthKey)!;
      existing.amount += transaction.amount;
      existing.count += 1;
    });

    return Array.from(monthlyData.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
  }
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">
          Transaction Trends
        </CardTitle>
        <p className="text-sm text-gray-500">
          Monthly transaction volume and amount
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#e5e7eb' }}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'amount') {
                    return [formatCurrency(value || 0), 'Total Amount'];
                  }
                  return [value?.toLocaleString() || '0', 'Transaction Count'];
                }}
                labelFormatter={(label) => `Month: ${label}`}
              />
              <Bar
                dataKey="amount"
                fill="#8b5cf6"
                radius={[4, 4, 0, 0]}
                name="amount"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
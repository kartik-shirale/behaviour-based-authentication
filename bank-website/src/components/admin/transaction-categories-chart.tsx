"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Transaction } from "@/data-testing";

interface TransactionCategoriesChartProps {
  transactions: Transaction[];
}

const COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042", 
  "#8884D8", "#82CA9D", "#FFC658", "#FF7C7C",
  "#8DD1E1", "#D084D0"
];

export function TransactionCategoriesChart({ transactions }: TransactionCategoriesChartProps) {
  // Group transactions by category
  const categoryData = transactions.reduce((acc, transaction) => {
    const category = transaction.category || "Other";
    if (!acc[category]) {
      acc[category] = {
        name: category,
        count: 0,
        volume: 0
      };
    }
    acc[category].count += 1;
    acc[category].volume += transaction.amount;
    return acc;
  }, {} as Record<string, { name: string; count: number; volume: number }>);

  const chartData = Object.values(categoryData)
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 10); // Show top 10 categories

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">
            Volume: {formatCurrency(data.volume)}
          </p>
          <p className="text-sm text-gray-600">
            Transactions: {data.count.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600">
            Avg: {formatCurrency(data.volume / data.count)}
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap gap-2 justify-center mt-4">
        {payload?.map((entry: any, index: number) => (
          <div key={index} className="flex items-center space-x-1 text-xs">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  const totalVolume = chartData.reduce((sum, item) => sum + item.volume, 0);
  const totalTransactions = chartData.reduce((sum, item) => sum + item.count, 0);
  const topCategory = chartData[0];

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">
          Transaction Categories
        </CardTitle>
        <div className="text-sm text-gray-500">
          Distribution by volume • Top {chartData.length} categories
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="volume"
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend content={<CustomLegend />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(totalVolume)}
                </div>
                <div className="text-sm text-gray-500">Total Volume</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {totalTransactions.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">Total Transactions</div>
              </div>
            </div>
            
            {topCategory && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-900">
                  Top Category: {topCategory.name}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {formatCurrency(topCategory.volume)} • {topCategory.count} transactions
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-2">No transaction data available</div>
            <div className="text-sm text-gray-400">
              Transaction categories will appear here once data is available
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
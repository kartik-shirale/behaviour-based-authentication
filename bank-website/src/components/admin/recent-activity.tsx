"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";
import { User, Transaction } from "@/data-testing";

interface RecentActivityProps {
  recentUsers: User[];
  recentTransactions: Transaction[];
}

export function RecentActivity({ recentUsers, recentTransactions }: RecentActivityProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'credit':
        return 'text-green-600';
      case 'debit':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users">Recent Users</TabsTrigger>
            <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="users" className="space-y-4 mt-4">
            {recentUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No recent users found
              </div>
            ) : (
              recentUsers.slice(0, 5).map((user) => (
                <div key={user.id} className="flex items-center space-x-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.profile || undefined} alt={user.fullName} />
                    <AvatarFallback>
                      {user.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.fullName}
                      </p>
                      <Badge 
                        variant={user.isActive ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {user.emailId}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-900 font-medium">
                      {formatCurrency(user.balance)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {user.createdAt ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true }) : 'Unknown'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
          
          <TabsContent value="transactions" className="space-y-4 mt-4">
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No recent transactions found
              </div>
            ) : (
              recentTransactions.slice(0, 5).map((transaction) => (
                <div key={transaction.id} className="flex items-center space-x-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {transaction.description}
                      </p>
                      <Badge 
                        className={`text-xs ${getStatusColor(transaction.status)}`}
                        variant="secondary"
                      >
                        {transaction.status}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <p className="text-xs text-gray-500">
                        {transaction.category} • {transaction.reference}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${getTransactionTypeColor(transaction.type)}`}>
                      {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {transaction.createdAt ? formatDistanceToNow(new Date(transaction.createdAt), { addSuffix: true }) : 'Unknown'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
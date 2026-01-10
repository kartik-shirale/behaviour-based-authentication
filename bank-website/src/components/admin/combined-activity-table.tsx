'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditCard, Activity, User, TrendingUp, AlertTriangle, Download, } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ArrowUpRight, ArrowDownLeft, Eye, Clock, Smartphone } from 'lucide-react';
import { usePaginationStore } from '@/store/usePaginationStore';
import TablePagination from '@/components/ui/table-pagination';

interface Transaction {
  id: string;
  description: string;
  type: 'credit' | 'debit';
  amount: number;
  status: string;
  createdAt: string;
}

interface BehavioralSession {
  id: string;
  sessionId: string;
  timestamp: string;
  touchPatterns?: any[];
}

interface CombinedActivityTableProps {
  transactions: Transaction[];
  behavioralSessions: BehavioralSession[];
  userId: string;
}

type TabType = 'transactions' | 'sessions';

export function CombinedActivityTable({
  transactions,
  behavioralSessions,
  userId
}: CombinedActivityTableProps) {
  const {
    activeTab,
    setActiveTab,
    setTableData,
    getCurrentPageData,
    getCurrentPagination,
    setTransactionsPage,
    setBehavioralSessionsPage,
    setTransactionsPageSize,
    setBehavioralSessionsPageSize,
  } = usePaginationStore();

  // Initialize store data when component mounts or data changes
  useEffect(() => {
    setTableData({
      transactions,
      behavioralSessions,
      filteredTransactions: transactions,
      filteredBehavioralSessions: behavioralSessions,
    });
  }, [transactions, behavioralSessions, setTableData]);

  const currentData = getCurrentPageData();
  const pagination = getCurrentPagination();
  const totalCount = activeTab === 'transactions' ? transactions.length : behavioralSessions.length;

  const handlePageChange = (page: number) => {
    if (activeTab === 'transactions') {
      setTransactionsPage(page);
    } else {
      setBehavioralSessionsPage(page);
    }
  };

  const handlePageSizeChange = (size: number) => {
    if (activeTab === 'transactions') {
      setTransactionsPageSize(size);
    } else {
      setBehavioralSessionsPageSize(size);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Recent Activity
          </div>
          <div className="flex space-x-2">
            <Badge variant="outline">
              {transactions.length} transactions
            </Badge>
            <Badge variant="outline">
              {behavioralSessions.length} sessions
            </Badge>
          </div>
        </CardTitle>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
          <Button
            variant={activeTab === 'transactions' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('transactions')}
            className="text-xs"
          >
            Transactions ({transactions.length})
          </Button>
          <Button
            variant={activeTab === 'raw_behavioral_sessions' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('raw_behavioral_sessions')}
            className="text-xs"
          >
            Behavioral Sessions ({behavioralSessions.length})
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid gap-4">
          {activeTab === 'transactions' ? (
            currentData.length > 0 ? (
              currentData.map((transaction: Transaction) => {
                const isCredit = transaction.type === 'credit';
                return (
                  <Card key={transaction.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <CreditCard className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">{transaction.description}</span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {transaction.type}
                            </Badge>
                          </div>

                          <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-2">
                              <Clock className="w-4 h-4" />
                              <span>{new Date(transaction.createdAt).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <TrendingUp className="w-4 h-4" />
                              <span className={isCredit ? 'text-green-600' : 'text-red-600'}>
                                {isCredit ? '+' : '-'}${transaction.amount ? transaction.amount.toLocaleString() : '0'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'}>
                            {transaction.status}
                          </Badge>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            <Button variant="outline" size="sm">
                              <Download className="w-4 h-4 mr-1" />
                              Export
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No transactions found</h3>
                  <p className="text-muted-foreground">
                    Transaction activities will appear here as users make payments.
                  </p>
                </CardContent>
              </Card>
            )
          ) : (
            currentData.length > 0 ? (
              currentData.map((session: BehavioralSession) => (
                <Card key={session.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <Smartphone className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">Session {session.sessionId}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            behavioral
                          </Badge>
                        </div>

                        <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4" />
                            <span>
                              {session.timestamp ? (
                                (() => {
                                  const date = new Date(session.timestamp);
                                  return isNaN(date.getTime()) ? 'Invalid date' : date.toLocaleString();
                                })()
                              ) : 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Activity className="w-4 h-4" />
                            <span>{session.touchPatterns?.length || 0} touch patterns</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <Badge variant="outline">
                          {session.touchPatterns?.length || 0} patterns
                        </Badge>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          <Button variant="outline" size="sm">
                            <Download className="w-4 h-4 mr-1" />
                            Export
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Smartphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No behavioral sessions found</h3>
                  <p className="text-muted-foreground">
                    Behavioral session data will appear here as users interact with the system.
                  </p>
                </CardContent>
              </Card>
            )
          )}
        </div>

        {/* Pagination Component */}
        <TablePagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          pageSize={pagination.pageSize}
          totalItems={pagination.totalItems}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={[5, 10, 20, 50]}
          showPageSizeSelector={true}
          className="mt-4"
        />

        {/* View All Link */}
        {totalCount > 0 && (
          <div className="pt-4 border-t">
            <Link href={`/admin/${activeTab}?userId=${userId}`}>
              <Button variant="outline" size="sm" className="w-full">
                View All {activeTab === 'transactions' ? 'Transactions' : 'Behavioral Sessions'} ({totalCount})
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
"use client";

import { useEffect, useState } from "react";
import { Search, Filter, Eye, MoreHorizontal, ArrowUpRight, ArrowDownLeft, Loader2, X } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDataStore } from "@/store/useDataStore";
import { formatDistanceToNow } from "date-fns";

interface TransactionsTableProps {
  userId?: string;
}

export function TransactionsTable({ userId }: TransactionsTableProps) {
  const {
    transactions,
    transactionsCache,
    setTransactionsPagination,
    setTransactionsFilters,
    setTransactionsSort,
    loadTransactions,
    resetFilters,
  } = useDataStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  // Load data on component mount
  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Handle search with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      setTransactionsFilters({ search: searchTerm || undefined });
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, setTransactionsFilters]);

  // Handle status filter
  useEffect(() => {
    setTransactionsFilters({ status: statusFilter === 'all' ? undefined : statusFilter || undefined });
  }, [statusFilter, setTransactionsFilters]);

  // Handle type filter
  useEffect(() => {
    setTransactionsFilters({ type: typeFilter === 'all' ? undefined : typeFilter || undefined });
  }, [typeFilter, setTransactionsFilters]);

  const handlePageChange = (page: number) => {
    setTransactionsPagination({ page });
  };

  const handlePageSizeChange = (pageSize: number) => {
    setTransactionsPagination({ pageSize, page: 1 });
  };

  const handleSort = (field: string) => {
    const currentSort = transactions.sort;
    const direction = currentSort.field === field && currentSort.direction === 'asc' ? 'desc' : 'asc';
    setTransactionsSort(field, direction);
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setTypeFilter("");
    resetFilters('transactions');
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { variant: "default" as const, color: "bg-green-100 text-green-800" },
      pending: { variant: "secondary" as const, color: "bg-yellow-100 text-yellow-800" },
      failed: { variant: "destructive" as const, color: "bg-red-100 text-red-800" },
      cancelled: { variant: "outline" as const, color: "bg-gray-100 text-gray-800" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <Badge variant={config.variant} className={config.color}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getTransactionIcon = (type: string) => {
    return type === 'credit' || type === 'deposit' ? (
      <ArrowDownLeft className="h-4 w-4 text-green-600" />
    ) : (
      <ArrowUpRight className="h-4 w-4 text-red-600" />
    );
  };

  const hasActiveFilters = searchTerm || statusFilter || typeFilter;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Transactions</CardTitle>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="h-8"
              >
                <X className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="credit">Credit</SelectItem>
              <SelectItem value="debit">Debit</SelectItem>
              <SelectItem value="deposit">Deposit</SelectItem>
              <SelectItem value="withdrawal">Withdrawal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Error State */}
        {transactions.ui.error && (
          <Alert className="mb-4">
            <AlertDescription>{transactions.ui.error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {transactions.ui.isLoading && !transactionsCache && (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
                <Skeleton className="h-4 w-[100px]" />
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        {!transactions.ui.isLoading || transactionsCache ? (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('id')}
                    >
                      Transaction ID
                      {transactions.sort.field === 'id' && (
                        <span className="ml-1">
                          {transactions.sort.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </TableHead>
                    <TableHead>User</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('amount')}
                    >
                      Amount
                      {transactions.sort.field === 'amount' && (
                        <span className="ml-1">
                          {transactions.sort.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('createdAt')}
                    >
                      Date
                      {transactions.sort.field === 'createdAt' && (
                        <span className="ml-1">
                          {transactions.sort.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactionsCache?.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactionsCache?.data.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">
                          {transaction.id}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                              {transaction.user?.name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <div className="font-medium">{transaction.user?.name || 'Unknown'}</div>
                              <div className="text-sm text-gray-500">{transaction.user?.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTransactionIcon(transaction.type)}
                            <span className="font-medium">
                              {formatAmount(transaction.amount)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(transaction.status)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-500">
                            {formatDistanceToNow(new Date(transaction.createdAt), { addSuffix: true })}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/transactions/${transaction.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {transactionsCache && transactionsCache.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    Showing {((transactionsCache.pagination.currentPage - 1) * transactionsCache.pagination.pageSize) + 1} to{' '}
                    {Math.min(
                      transactionsCache.pagination.currentPage * transactionsCache.pagination.pageSize,
                      transactionsCache.pagination.totalItems
                    )}{' '}
                    of {transactionsCache.pagination.totalItems} results
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={transactions.pagination.pageSize.toString()}
                    onValueChange={(value) => handlePageSizeChange(parseInt(value))}
                  >
                    <SelectTrigger className="w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(transactionsCache.pagination.currentPage - 1)}
                      disabled={!transactionsCache.pagination.hasPreviousPage}
                    >
                      Previous
                    </Button>
                    <span className="text-sm px-3">
                      Page {transactionsCache.pagination.currentPage} of {transactionsCache.pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(transactionsCache.pagination.currentPage + 1)}
                      disabled={!transactionsCache.pagination.hasNextPage}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
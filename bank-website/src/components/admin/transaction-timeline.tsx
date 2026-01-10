import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowUpRight, ArrowDownLeft, Clock, CreditCard, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Transaction } from "@/data-testing";

interface TransactionTimelineProps {
  transactions: Transaction[];
  showActions?: boolean;
  maxItems?: number;
  title?: string;
}

export function TransactionTimeline({ 
  transactions, 
  showActions = true, 
  maxItems = 10,
  title = "Transaction Timeline" 
}: TransactionTimelineProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string | Date) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return {
        relative: formatDistanceToNow(dateObj, { addSuffix: true }),
        absolute: dateObj.toLocaleString()
      };
    } catch {
      return {
        relative: 'Unknown',
        absolute: 'Unknown'
      };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "credit":
      case "deposit":
        return <ArrowDownLeft className="h-4 w-4 text-green-600" />;
      case "debit":
      case "withdrawal":
        return <ArrowUpRight className="h-4 w-4 text-red-600" />;
      default:
        return <CreditCard className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "default";
      case "pending": return "secondary";
      case "failed": return "destructive";
      default: return "secondary";
    }
  };

  const getAmountColor = (type: string) => {
    switch (type) {
      case "credit":
      case "deposit":
        return "text-green-600";
      case "debit":
      case "withdrawal":
        return "text-red-600";
      default:
        return "text-gray-900";
    }
  };

  const displayTransactions = transactions.slice(0, maxItems);
  const hasMore = transactions.length > maxItems;

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No transactions found</p>
            <p className="text-sm text-gray-400">Transaction history will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            {title}
          </CardTitle>
          <div className="text-sm text-gray-500">
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayTransactions.map((transaction, index) => {
            const dateInfo = formatDate(transaction.createdAt);
            
            return (
              <div key={transaction.id} className="relative">
                {/* Timeline line */}
                {index < displayTransactions.length - 1 && (
                  <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-200" />
                )}
                
                {/* Transaction item */}
                <div className="flex items-start space-x-4 p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                  {/* Icon */}
                  <div className="flex-shrink-0 w-12 h-12 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center">
                    {getTypeIcon(transaction.type)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-900 truncate">
                          {transaction.description || `${transaction.type} Transaction`}
                        </h4>
                        <Badge variant={getStatusColor(transaction.status)} className="text-xs">
                          {transaction.status}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(transaction.status)}
                        <span className={`font-semibold ${getAmountColor(transaction.type)}`}>
                          {transaction.type === 'credit' ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid gap-2 md:grid-cols-2 text-sm text-gray-500">
                      <div>
                        <span className="font-medium">Reference:</span> {transaction.reference}
                      </div>
                      <div>
                        <span className="font-medium">Category:</span> {transaction.category || 'Other'}
                      </div>
                      {transaction.fromMobile && (
                        <div>
                          <span className="font-medium">From:</span> {transaction.fromMobile}
                        </div>
                      )}
                      {transaction.toMobile && (
                        <div>
                          <span className="font-medium">To:</span> {transaction.toMobile}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mt-3">
                      <div className="text-xs text-gray-400">
                        <span title={dateInfo.absolute}>{dateInfo.relative}</span>
                        {transaction.updatedAt && transaction.updatedAt !== transaction.createdAt && (
                          <span className="ml-2">
                            • Updated {formatDate(transaction.updatedAt).relative}
                          </span>
                        )}
                      </div>
                      {showActions && (
                        <Link href={`/admin/transactions/${transaction.id}`}>
                          <Button variant="ghost" size="sm" className="text-xs">
                            View Details
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {hasMore && (
            <>
              <Separator />
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 mb-3">
                  Showing {maxItems} of {transactions.length} transactions
                </p>
                {showActions && (
                  <Button variant="outline" size="sm">
                    View All Transactions
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
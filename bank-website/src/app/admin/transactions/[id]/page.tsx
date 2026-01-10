import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTransactionById, getUserById } from "@/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, CreditCard, User, Calendar, MapPin, Shield, AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface TransactionDetailPageProps {
  params: {
    id: string;
  };
}

export default async function TransactionDetailPage({ params }: TransactionDetailPageProps) {
  const { id } = params;

  const transaction = await getTransactionById(id);

  if (!transaction) {
    notFound();
  }

  // Fetch related user data
  const [fromUser, toUser] = await Promise.all([
    transaction.fromUserId ? getUserById(transaction.fromUserId) : null,
    transaction.toUserId ? getUserById(transaction.toUserId) : null,
  ]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
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

  const getRiskLevel = (amount: number) => {
    if (amount > 50000) return { level: 'High', color: 'bg-red-100 text-red-800' };
    if (amount > 10000) return { level: 'Medium', color: 'bg-yellow-100 text-yellow-800' };
    return { level: 'Low', color: 'bg-green-100 text-green-800' };
  };

  const riskLevel = getRiskLevel(transaction.amount);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/admin/transactions">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Transactions
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Transaction Details</h1>
            <p className="text-muted-foreground">Reference: {transaction.reference}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusIcon(transaction.status)}
          <Badge className={getStatusColor(transaction.status)}>
            {transaction.status.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Transaction Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Transaction Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Amount</p>
              <p className="text-2xl font-bold text-green-600">
                ${transaction.amount ? transaction.amount.toLocaleString() : '0'}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Type</p>
              <Badge variant="outline" className="text-sm">
                {transaction.type || 'N/A'}
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Category</p>
              <Badge variant="outline" className="text-sm">
                {transaction.category || 'General'}
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Risk Level</p>
              <Badge className={riskLevel.color}>
                {riskLevel.level}
              </Badge>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="text-sm">{transaction.description || 'No description provided'}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Transaction Date</p>
              <p className="text-sm">
                {new Date(transaction.createdAt).toLocaleString()}
                <span className="text-muted-foreground ml-2">
                  ({formatDistanceToNow(new Date(transaction.createdAt), { addSuffix: true })})
                </span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Information */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* From User */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              From User
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {fromUser ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{fromUser.fullName}</p>
                    <p className="text-sm text-muted-foreground">{fromUser.emailId}</p>
                  </div>
                  <Link href={`/admin/users/${fromUser.id}`}>
                    <Button variant="outline" size="sm">
                      View Profile
                    </Button>
                  </Link>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Mobile:</span>
                    <span className="text-sm">{fromUser.mobile}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Account:</span>
                    <span className="text-sm font-mono">{fromUser.accountNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Balance:</span>
                    <span className="text-sm font-semibold">
                      ${fromUser.balance ? fromUser.balance.toLocaleString() : '0'}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Mobile: {transaction.fromMobile || 'N/A'}</p>
                <p className="text-sm text-muted-foreground">User ID: {transaction.fromUserId || 'N/A'}</p>
                <p className="text-sm text-red-500">User details not found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* To User */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              To User
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {toUser ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{toUser.fullName}</p>
                    <p className="text-sm text-muted-foreground">{toUser.emailId}</p>
                  </div>
                  <Link href={`/admin/users/${toUser.id}`}>
                    <Button variant="outline" size="sm">
                      View Profile
                    </Button>
                  </Link>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Mobile:</span>
                    <span className="text-sm">{toUser.mobile}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Account:</span>
                    <span className="text-sm font-mono">{toUser.accountNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Balance:</span>
                    <span className="text-sm font-semibold">
                      ${toUser.balance ? toUser.balance.toLocaleString() : '0'}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Mobile: {transaction.toMobile || 'N/A'}</p>
                <p className="text-sm text-muted-foreground">User ID: {transaction.toUserId || 'N/A'}</p>
                <p className="text-sm text-red-500">User details not found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fraud Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Fraud Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Risk Score</p>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${riskLevel.level === 'High' ? 'bg-red-500' :
                    riskLevel.level === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                <span className="text-sm font-medium">{riskLevel.level} Risk</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Fraud Indicators</p>
              <div className="space-y-1">
                {transaction.amount > 50000 && (
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-3 w-3 text-red-500" />
                    <span className="text-xs text-red-600">High amount transaction</span>
                  </div>
                )}
                {transaction.status === 'failed' && (
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-3 w-3 text-red-500" />
                    <span className="text-xs text-red-600">Failed transaction</span>
                  </div>
                )}
                {!fromUser && (
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-3 w-3 text-yellow-500" />
                    <span className="text-xs text-yellow-600">Unknown sender</span>
                  </div>
                )}
                {(!fromUser && !toUser) ? (
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-green-600">No major fraud indicators</span>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Verification Status</p>
              <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'}>
                {transaction.status === 'completed' ? 'Verified' : 'Pending Verification'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technical Details */}
      <Card>
        <CardHeader>
          <CardTitle>Technical Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Transaction ID</p>
                <p className="text-sm font-mono">{transaction.id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reference Number</p>
                <p className="text-sm font-mono">{transaction.reference}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created At</p>
                <p className="text-sm">{new Date(transaction.createdAt).toISOString()}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Updated At</p>
                <p className="text-sm">{new Date(transaction.updatedAt).toISOString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Processing Time</p>
                <p className="text-sm">
                  {Math.abs(new Date(transaction.updatedAt).getTime() - new Date(transaction.createdAt).getTime()) / 1000} seconds
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Loading component
export function TransactionDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-9 w-32" />
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48 mt-2" />
          </div>
        </div>
        <div className="flex space-x-2">
          <Skeleton className="h-6 w-20" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[...Array(4)].map((_, j) => (
                <Skeleton key={j} className="h-4 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
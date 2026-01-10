import { Suspense } from "react";
import { getAdminStats } from "@/actions/admin";
import { StatsCards } from "@/components/admin/stats-cards";
import { UserGrowthChart } from "@/components/admin/user-growth-chart";
import { TransactionTrendsChart } from "@/components/admin/transaction-trends-chart";
import { RecentActivity } from "@/components/admin/recent-activity";
import { TransactionStatusChart } from "@/components/admin/transaction-status-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

async function AdminDashboard() {
  const stats = await getAdminStats();

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitor and manage your fraud detection system</p>
        </div>
        <div className="text-xs sm:text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg">
          Last updated: {new Date().toLocaleString()}
        </div>
      </div>

      <StatsCards stats={stats} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        <UserGrowthChart data={stats.userGrowth} />
        <TransactionTrendsChart data={stats.transactionTrends} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        <div className="xl:col-span-2">
          <RecentActivity
            recentUsers={stats.recentUsers}
            recentTransactions={stats.recentTransactions}
          />
        </div>
        <TransactionStatusChart data={stats.transactionStatus} />
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <AdminDashboard />
    </Suspense>
  );
}
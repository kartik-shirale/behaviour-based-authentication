"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Clock, TrendingUp } from "lucide-react";

interface TransactionStatusChartProps {
    data: {
        completed: number;
        failed: number;
        pending: number;
        total: number;
    };
}

export function TransactionStatusChart({ data }: TransactionStatusChartProps) {
    const completedPercentage = data.total > 0 ? (data.completed / data.total) * 100 : 0;
    const failedPercentage = data.total > 0 ? (data.failed / data.total) * 100 : 0;
    const pendingPercentage = data.total > 0 ? (data.pending / data.total) * 100 : 0;

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Transaction Status
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                    Overview of all transaction outcomes
                </p>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Progress Bar - All violet shades */}
                <div className="h-3 rounded-full bg-muted overflow-hidden flex">
                    <div
                        className="bg-violet-600 transition-all duration-500"
                        style={{ width: `${completedPercentage}%` }}
                    />
                    <div
                        className="bg-violet-400 transition-all duration-500"
                        style={{ width: `${failedPercentage}%` }}
                    />
                    <div
                        className="bg-violet-200 dark:bg-violet-800 transition-all duration-500"
                        style={{ width: `${pendingPercentage}%` }}
                    />
                </div>

                {/* Status Items - All violet shades */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-md bg-violet-50 dark:bg-violet-950/30">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-md bg-violet-600/20">
                                <CheckCircle2 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                            </div>
                            <div>
                                <p className="font-medium text-violet-700 dark:text-violet-300">Completed</p>
                                <p className="text-xs text-violet-600/70 dark:text-violet-400/70">Successful transactions</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-bold text-violet-700 dark:text-violet-300">{data.completed.toLocaleString()}</p>
                            <p className="text-xs text-violet-600/70 dark:text-violet-400/70">{completedPercentage.toFixed(1)}%</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-md bg-violet-50/70 dark:bg-violet-950/20">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-md bg-violet-400/20">
                                <XCircle className="h-4 w-4 text-violet-500 dark:text-violet-400" />
                            </div>
                            <div>
                                <p className="font-medium text-violet-600 dark:text-violet-400">Failed</p>
                                <p className="text-xs text-violet-500/70 dark:text-violet-400/70">Unsuccessful transactions</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-bold text-violet-600 dark:text-violet-400">{data.failed.toLocaleString()}</p>
                            <p className="text-xs text-violet-500/70 dark:text-violet-400/70">{failedPercentage.toFixed(1)}%</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-md bg-violet-50/50 dark:bg-violet-950/10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-md bg-violet-200/50 dark:bg-violet-800/30">
                                <Clock className="h-4 w-4 text-violet-400 dark:text-violet-500" />
                            </div>
                            <div>
                                <p className="font-medium text-violet-500 dark:text-violet-500">Pending</p>
                                <p className="text-xs text-violet-400/70 dark:text-violet-500/70">Awaiting processing</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-bold text-violet-500 dark:text-violet-500">{data.pending.toLocaleString()}</p>
                            <p className="text-xs text-violet-400/70 dark:text-violet-500/70">{pendingPercentage.toFixed(1)}%</p>
                        </div>
                    </div>
                </div>

                {/* Total */}
                <div className="pt-3 border-t border-border">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total Transactions</span>
                        <span className="text-lg font-bold text-foreground">{data.total.toLocaleString()}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

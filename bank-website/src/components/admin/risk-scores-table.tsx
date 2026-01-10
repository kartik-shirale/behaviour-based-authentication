"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Shield, RefreshCw, ChevronLeft, ChevronRight, Database } from "lucide-react";
import { RiskScore, getUserRiskScores, PaginatedResponse } from "@/actions/admin";
import { formatDistanceToNow } from "date-fns";

interface RiskScoresTableProps {
  userId: string;
}

function getRiskLevelColor(riskLevel: string) {
  switch (riskLevel) {
    case 'low':
      return 'bg-green-500';
    case 'medium':
      return 'bg-yellow-500';
    case 'high':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
}

function getRiskLevelVariant(riskLevel: string): "default" | "secondary" | "destructive" | "outline" {
  switch (riskLevel) {
    case 'low':
      return 'secondary';
    case 'medium':
      return 'outline';
    case 'high':
      return 'destructive';
    default:
      return 'default';
  }
}

export function RiskScoresTable({ userId }: RiskScoresTableProps) {
  const [data, setData] = useState<PaginatedResponse<RiskScore> | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const pageSize = 10;

  const fetchRiskScores = async (page: number = 1) => {
    try {
      setLoading(page === 1);
      setRefreshing(page !== 1);
      const result = await getUserRiskScores(userId, page, pageSize);
      setData(result);
    } catch (error) {
      console.error('Error fetching risk scores:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRiskScores(currentPage);
  }, [userId, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRefresh = () => {
    fetchRiskScores(currentPage);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Risk Scores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Risk Scores
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="ml-auto"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Database className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Risk Scores Available</h3>
            <p className="text-muted-foreground mb-4">
              No risk assessment data has been generated for this user yet.
            </p>
            <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Check Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Risk Scores
          <Badge variant="secondary" className="ml-2">
            {data.pagination.totalItems} total
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="ml-auto"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Risk Scores Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session ID</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Total Score</TableHead>
                  <TableHead>Breakdown</TableHead>
                  <TableHead>Alerts</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((riskScore) => (
                  <TableRow key={riskScore.id}>
                    <TableCell className="font-mono text-xs">
                      {riskScore.sessionId.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRiskLevelVariant(riskScore.riskLevel)}>
                        {riskScore.riskLevel.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{riskScore.totalScore}/100</span>
                        </div>
                        <Progress 
                          value={riskScore.totalScore} 
                          className="h-2 w-16"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>Location:</span>
                          <span>{riskScore.breakdown.locationRisk}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Behavior:</span>
                          <span>{riskScore.breakdown.behaviorRisk}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Device:</span>
                          <span>{riskScore.breakdown.deviceRisk}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Network:</span>
                          <span>{riskScore.breakdown.networkRisk}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Typing:</span>
                          <span>{riskScore.breakdown.typingRisk}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {riskScore.alerts.slice(0, 2).map((alert, index) => (
                          <Badge 
                            key={index} 
                            variant={getRiskLevelVariant(alert.severity)}
                            className="text-xs"
                          >
                            {alert.type}
                          </Badge>
                        ))}
                        {riskScore.alerts.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{riskScore.alerts.length - 2} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {riskScore.timestamp && formatDistanceToNow(
                        new Date(riskScore.timestamp.seconds ? riskScore.timestamp.seconds * 1000 : riskScore.timestamp),
                        { addSuffix: true }
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {((data.pagination.currentPage - 1) * data.pagination.pageSize) + 1} to{' '}
                {Math.min(data.pagination.currentPage * data.pagination.pageSize, data.pagination.totalItems)} of{' '}
                {data.pagination.totalItems} results
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!data.pagination.hasPreviousPage}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm">
                  Page {data.pagination.currentPage} of {data.pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!data.pagination.hasNextPage}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Latest Risk Score Details */}
          {data.data.length > 0 && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Latest Risk Assessment
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Reason:</span>
                  <p className="mt-1">{data.data[0].reason}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Recommendation:</span>
                  <p className="mt-1">{data.data[0].recommendation}</p>
                </div>
              </div>
              {data.data[0].extraInfo?.locationCoordinates && (
                <div className="mt-3 pt-3 border-t">
                  <span className="text-muted-foreground text-sm">Location:</span>
                  <p className="text-sm mt-1">
                    {data.data[0].extraInfo.locationCoordinates.latitude.toFixed(4)}, {data.data[0].extraInfo.locationCoordinates.longitude.toFixed(4)}
                    {' '}(±{data.data[0].extraInfo.locationCoordinates.accuracy}m)
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
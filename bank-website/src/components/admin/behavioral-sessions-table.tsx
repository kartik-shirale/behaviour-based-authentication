"use client";

import { useEffect, useState } from "react";
import { Search, AlertTriangle, Shield, X, Clock, Activity, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

interface BehavioralSessionsTableProps {
  userId?: string;
}

export function BehavioralSessionsTable({ userId }: BehavioralSessionsTableProps) {
  const {
    raw_behavioral_sessions,
    raw_behavioral_sessionsCache,
    setRaw_behavioral_sessionsPagination,
    setRaw_behavioral_sessionsFilters,
    loadRaw_behavioral_sessions,
    resetFilters,
  } = useDataStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [behaviorFilter, setBehaviorFilter] = useState<string>("");

  useEffect(() => {
    loadRaw_behavioral_sessions();
  }, [loadRaw_behavioral_sessions]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setRaw_behavioral_sessionsFilters({ search: searchTerm || undefined });
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, setRaw_behavioral_sessionsFilters]);

  useEffect(() => {
    setRaw_behavioral_sessionsFilters({ type: behaviorFilter === 'all' ? undefined : behaviorFilter || undefined });
  }, [behaviorFilter, setRaw_behavioral_sessionsFilters]);

  const handlePageChange = (page: number) => {
    setRaw_behavioral_sessionsPagination({ page });
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setBehaviorFilter("");
    resetFilters('raw_behavioral_sessions');
  };

  const formatTimeAgo = (timestamp: string | number) => {
    if (!timestamp) return 'N/A';
    const date = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
    if (isNaN(date.getTime())) return 'Invalid date';
    try {
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'Invalid date';
    }
  };

  const getBehaviorSummary = (session: any) => {
    const parts = [];
    if (session.touchPatterns?.length > 0) parts.push(`${session.touchPatterns.length} touches`);
    if (session.typingPatterns?.length > 0) parts.push(`${session.typingPatterns.length} keystrokes`);
    if (session.motionPattern?.length > 0) parts.push(`${session.motionPattern.length} motions`);
    return parts.length > 0 ? parts.join(' • ') : 'No data';
  };

  const getRiskBadge = (session: any) => {
    // Simplified risk calculation based on available data
    const hasMotion = session.motionPattern?.length > 0;
    const hasTouch = session.touchPatterns?.length > 0;
    const dataPoints = (session.touchPatterns?.length || 0) + (session.typingPatterns?.length || 0) + (session.motionPattern?.length || 0);

    if (dataPoints > 50) {
      return <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"><Shield className="h-3 w-3 mr-1" />Low</Badge>;
    } else if (dataPoints > 10) {
      return <Badge className="bg-violet-200/70 text-violet-600 dark:bg-violet-800/30 dark:text-violet-400"><AlertTriangle className="h-3 w-3 mr-1" />Medium</Badge>;
    }
    return <Badge className="bg-violet-300/50 text-violet-500 dark:bg-violet-700/30 dark:text-violet-500"><AlertTriangle className="h-3 w-3 mr-1" />High</Badge>;
  };

  const hasActiveFilters = searchTerm || behaviorFilter;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Behavioral Sessions</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">User behavior analysis data</p>
          </div>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={handleResetFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by user ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={behaviorFilter} onValueChange={setBehaviorFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Behavior" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="motion">Motion</SelectItem>
              <SelectItem value="touch">Touch</SelectItem>
              <SelectItem value="typing">Typing</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Error State */}
        {raw_behavioral_sessions.ui.error && (
          <Alert className="mb-4">
            <AlertDescription>{raw_behavioral_sessions.ui.error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {raw_behavioral_sessions.ui.isLoading && !raw_behavioral_sessionsCache && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-md border">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        )}

        {/* Sessions List */}
        {!raw_behavioral_sessions.ui.isLoading || raw_behavioral_sessionsCache ? (
          <>
            {raw_behavioral_sessionsCache?.data.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No sessions found</h3>
                <p className="text-muted-foreground text-sm">Sessions will appear here once users start interacting.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {raw_behavioral_sessionsCache?.data.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center gap-4 p-3 rounded-md border border-border/50 hover:border-border hover:bg-muted/30 transition-colors"
                  >
                    {/* User Avatar */}
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={session.user?.profile} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {session.userId?.slice(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>

                    {/* Main Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {session.user?.fullName || session.userId || 'Unknown User'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          #{session.sessionId?.slice(-6) || session.id?.slice(-6)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {getBehaviorSummary(session)}
                      </p>
                    </div>

                    {/* Time */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                      <Clock className="h-3 w-3" />
                      {formatTimeAgo(session.timestamp)}
                    </div>

                    {/* Risk Badge */}
                    {getRiskBadge(session)}
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {raw_behavioral_sessionsCache && raw_behavioral_sessionsCache.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <span className="text-sm text-muted-foreground">
                  Page {raw_behavioral_sessionsCache.pagination.currentPage} of {raw_behavioral_sessionsCache.pagination.totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(raw_behavioral_sessionsCache.pagination.currentPage - 1)}
                    disabled={!raw_behavioral_sessionsCache.pagination.hasPreviousPage}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(raw_behavioral_sessionsCache.pagination.currentPage + 1)}
                    disabled={!raw_behavioral_sessionsCache.pagination.hasNextPage}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
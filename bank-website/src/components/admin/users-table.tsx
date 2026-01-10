"use client";

import { useEffect, useState } from "react";
import { Search, Eye, MoreHorizontal, Shield, AlertTriangle, User, X } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

interface UsersTableProps {
  showFilters?: boolean;
}

export function UsersTable({ showFilters = true }: UsersTableProps) {
  const {
    users,
    usersCache,
    setUsersPagination,
    setUsersFilters,
    setUsersSort,
    loadUsers,
    resetFilters,
  } = useDataStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("");

  // Load data on component mount
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Handle search with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      setUsersFilters({ search: searchTerm || undefined });
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, setUsersFilters]);

  // Handle status filter
  useEffect(() => {
    setUsersFilters({ status: statusFilter === 'all' ? undefined : statusFilter || undefined });
  }, [statusFilter, setUsersFilters]);

  // Handle role filter (using type field)
  useEffect(() => {
    setUsersFilters({ type: roleFilter === 'all' ? undefined : roleFilter || undefined });
  }, [roleFilter, setUsersFilters]);

  const handlePageChange = (page: number) => {
    setUsersPagination({ page });
  };

  const handlePageSizeChange = (pageSize: number) => {
    setUsersPagination({ pageSize, page: 1 });
  };

  const handleSort = (field: string) => {
    const currentSort = users.sort;
    const direction = currentSort.field === field && currentSort.direction === 'asc' ? 'desc' : 'asc';
    setUsersSort(field, direction);
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setRoleFilter("");
    resetFilters('users');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: "default" as const, color: "bg-green-100 text-green-800" },
      inactive: { variant: "secondary" as const, color: "bg-gray-100 text-gray-800" },
      suspended: { variant: "destructive" as const, color: "bg-red-100 text-red-800" },
      pending: { variant: "outline" as const, color: "bg-yellow-100 text-yellow-800" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    return (
      <Badge variant={config.variant} className={config.color}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      admin: { variant: "destructive" as const, color: "bg-purple-100 text-purple-800", icon: Shield },
      user: { variant: "default" as const, color: "bg-blue-100 text-blue-800", icon: User },
      moderator: { variant: "secondary" as const, color: "bg-orange-100 text-orange-800", icon: AlertTriangle },
    };

    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.user;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Badge>
    );
  };

  const formatUserName = (user: any) => {
    if (user.fullName) return user.fullName;
    if (user.name) return user.name;
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    if (user.firstName) return user.firstName;
    if (user.emailId) return user.emailId.split('@')[0];
    if (user.email) return user.email.split('@')[0];
    return 'Unknown User';
  };

  const hasActiveFilters = searchTerm || statusFilter || roleFilter;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users Management</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        {showFilters && (
          <div className="bg-muted/30 border border-border/50 rounded-lg p-6 mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">Filter Users</h3>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-8 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Error State */}
        {users.ui.error && (
          <Alert className="mb-4">
            <AlertDescription>{users.ui.error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {users.ui.isLoading && !usersCache && (
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
        {!users.ui.isLoading || usersCache ? (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('id')}
                    >
                      User
                      {users.sort.field === 'id' && (
                        <span className="ml-1">
                          {users.sort.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Transactions</TableHead>
                    <TableHead>Sessions</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('createdAt')}
                    >
                      Joined
                      {users.sort.field === 'createdAt' && (
                        <span className="ml-1">
                          {users.sort.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersCache?.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    usersCache?.data.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={user.profile || user.avatar || user.profileImage} alt={formatUserName(user)} />
                              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                {formatUserName(user).charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-foreground">{formatUserName(user)}</div>
                              <div className="text-xs text-muted-foreground">ID: {user.id.slice(0, 8)}...</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="text-sm text-foreground">{user.emailId || user.email || 'N/A'}</div>
                            {(user.mobile || user.phone) && (
                              <div className="text-xs text-muted-foreground">{user.mobile || user.phone}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getRoleBadge(user.role || 'user')}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(user.status || 'active')}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">
                            {user.transactionCount || 0}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">
                            {user.sessionCount || 0}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-500">
                            {user.createdAt ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true }) : 'Unknown'}
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
                                <Link href={`/admin/users/${user.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Profile
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/transactions?userId=${user.id}`}>
                                  View Transactions
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/behavioral-sessions?userId=${user.id}`}>
                                  View Sessions
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
            {usersCache && usersCache.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    Showing {((usersCache.pagination.currentPage - 1) * usersCache.pagination.pageSize) + 1} to{' '}
                    {Math.min(
                      usersCache.pagination.currentPage * usersCache.pagination.pageSize,
                      usersCache.pagination.totalItems
                    )}{' '}
                    of {usersCache.pagination.totalItems} results
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={users.pagination.pageSize.toString()}
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
                      onClick={() => handlePageChange(usersCache.pagination.currentPage - 1)}
                      disabled={!usersCache.pagination.hasPreviousPage}
                    >
                      Previous
                    </Button>
                    <span className="text-sm px-3">
                      Page {usersCache.pagination.currentPage} of {usersCache.pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(usersCache.pagination.currentPage + 1)}
                      disabled={!usersCache.pagination.hasNextPage}
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

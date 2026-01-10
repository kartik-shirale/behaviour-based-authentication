import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { User, Shield, ShieldCheck, Phone, Mail, CreditCard, Calendar } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { User as UserType } from "@/data-testing";

interface UserProfileCardProps {
  user: UserType;
  showActions?: boolean;
  compact?: boolean;
}

export function UserProfileCard({ user, showActions = true, compact = false }: UserProfileCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

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
      return formatDistanceToNow(dateObj, { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  if (compact) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.profile || undefined} alt={user.fullName} />
              <AvatarFallback className="text-sm">
                {getInitials(user.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <p className="font-medium text-gray-900 truncate">{user.fullName}</p>
                <div className="flex items-center space-x-1">
                  <Badge variant={user.isActive ? "default" : "secondary"} className="text-xs">
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                  {user.biometricEnabled && (
                    <Badge variant="outline" className="text-xs">
                      Biometric
                    </Badge>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-500 truncate">{user.emailId}</p>
            </div>
            {showActions && (
              <Link href={`/admin/users/${user.id}`}>
                <Button variant="outline" size="sm">
                  View Profile
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            User Profile
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant={user.isActive ? "default" : "secondary"}>
              {user.isActive ? "Active" : "Inactive"}
            </Badge>
            {user.biometricEnabled && (
              <Badge variant="outline">
                Biometric
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Information */}
        <div className="flex items-start space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.profile || undefined} alt={user.fullName} />
            <AvatarFallback className="text-lg">
              {getInitials(user.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{user.fullName}</h3>
              <p className="text-sm text-gray-500 capitalize">
                {user.gender}, {user.age} years old
              </p>
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <Mail className="h-4 w-4 text-gray-400" />
                <span>{user.emailId}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Phone className="h-4 w-4 text-gray-400" />
                <span>{user.mobile}</span>
              </div>
            </div>
          </div>
          {showActions && (
            <div className="flex flex-col space-y-2">
              <Link href={`/admin/users/${user.id}`}>
                <Button variant="outline" size="sm" className="w-full">
                  View Full Profile
                </Button>
              </Link>
              <Link href={`/admin/users/${user.id}#transactions`}>
                <Button variant="ghost" size="sm" className="w-full">
                  View Transactions
                </Button>
              </Link>
            </div>
          )}
        </div>

        <Separator />

        {/* Account Information */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Account Details</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Account Number:</span>
                <span className="text-sm font-mono">{user.accountNumber}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Bank:</span>
                <span className="text-sm">{user.bankName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Account Type:</span>
                <span className="text-sm capitalize">{user.accountType}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Balance:</span>
                <span className="text-sm font-semibold">{formatCurrency(user.balance)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Security & Access</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Biometric:</span>
                <div className="flex items-center space-x-1">
                  {user.biometricEnabled ? (
                    <ShieldCheck className="h-4 w-4 text-green-600" />
                  ) : (
                    <Shield className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-sm capitalize">
                    {user.biometricEnabled ? user.biometricType : "Disabled"}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Last Login:</span>
                <span className="text-sm">
                  {user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Created:</span>
                <span className="text-sm">
                  {user.createdAt ? formatDate(user.createdAt) : "Unknown"}
                </span>
              </div>
            </div>
          </div>
        </div>


      </CardContent>
    </Card>
  );
}
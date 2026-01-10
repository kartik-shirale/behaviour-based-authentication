import { Suspense } from "react";
import { notFound } from "next/navigation";
import { 
  getUserById, 
  getUserTransactions, 
  getUserBehavioralSessions,
  getUserBehaviorProfile,
  getUserVectorEmbeddings,
  getUserLatestRiskScore
} from "@/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, User, CreditCard, Activity, Shield, Phone, Mail, Calendar, MapPin } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import { CombinedActivityTable } from "@/components/admin/combined-activity-table";
import { BehaviorProfileCard } from "@/components/admin/behavior-profile-card";
import { VectorEmbeddingsCard } from "@/components/admin/vector-embeddings-card";
import { RiskScoresTable } from "@/components/admin/risk-scores-table";

interface UserDetailPageProps {
  params: {
    id: string;
  };
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const { id } = params;

  const [user, transactions, behavioralSessions, behaviorProfile, vectorEmbeddings, latestRiskScore] = await Promise.all([
    getUserById(id),
    getUserTransactions(id),
    getUserBehavioralSessions(id),
    getUserBehaviorProfile(id),
    getUserVectorEmbeddings(id),
    getUserLatestRiskScore(id),
  ]);

  if (!user) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/admin/users">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Users
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{user.fullName}</h1>
            <p className="text-muted-foreground">User ID: {user.id}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={user.isActive ? "default" : "secondary"}>
            {user.isActive ? "Active" : "Inactive"}
          </Badge>
          <Badge variant={user.pinHash ? "default" : "destructive"}>
            {user.pinHash ? "Verified" : "Unverified"}
          </Badge>
        </div>
      </div>

      {/* Enhanced User Profile Section */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-4">
        {/* Main Profile Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              User Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Profile Header */}
            <div className="flex items-start space-x-4">
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {user.profile ? (
                  <Image
                    src={user?.profile}
                    alt={user.fullName}
                    width={40}
                    height={40}
                    className="rounded-full object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    {user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div>
                  <h3 className="text-2xl font-semibold text-gray-900">{user.fullName}</h3>
                  <p className="text-sm text-muted-foreground capitalize">
                    {user.gender}, {user.age} years old
                  </p>
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{user.emailId}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{user.mobile}</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Personal Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Personal Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Full Name:</span>
                    <span className="font-medium">{user.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Age:</span>
                    <span className="font-medium">{user.age} years</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gender:</span>
                    <span className="font-medium capitalize">{user.gender}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium">{user.emailId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mobile:</span>
                    <span className="font-medium">{user.mobile}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Banking Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bank:</span>
                    <span className="font-medium">{user.bankName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Branch:</span>
                    <span className="font-medium">{user.branchName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IFSC:</span>
                    <span className="font-medium font-mono">{user.ifscCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account Type:</span>
                    <Badge variant="outline" className="capitalize">{user.accountType}</Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              Account Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className="text-3xl font-bold text-green-600">₹{user.balance ? user.balance.toLocaleString() : '0'}</p>
            </div>
            <Separator />
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Account Number</p>
                <p className="font-mono text-sm font-medium">{user.accountNumber}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Account Status</p>
                <div className="flex items-center space-x-2">
                  <Badge variant={user.isActive ? "default" : "secondary"}>
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Badge variant={user.pinHash ? "default" : "destructive"}>
                    {user.pinHash ? "Verified" : "Unverified"}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security & Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Security & Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Biometric Authentication</p>
              <Badge variant={user.biometricEnabled ? "default" : "secondary"} className="mt-1">
                {user.biometricEnabled ? `✓ ${user.biometricType || 'Enabled'}` : "Disabled"}
              </Badge>
            </div>
            <Separator />
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Last Login</p>
                <p className="text-sm font-medium">
                  {user.lastLoginAt
                    ? formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true })
                    : "Never logged in"
                  }
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Member Since</p>
                <p className="text-sm font-medium">
                  {new Date(user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Profile Updated</p>
                <p className="text-sm font-medium">
                  {formatDistanceToNow(new Date(user.updatedAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Profile Information */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recovery & Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Security Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Recovery Questions</p>
              <p className="text-sm font-medium">
                {user.recoveryQuestions && user.recoveryQuestions.length > 0
                  ? `${user.recoveryQuestions.length} questions configured`
                  : "Not configured"
                }
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">PIN Security</p>
              <Badge variant={user.pinHash ? "default" : "secondary"}>
                {user.pinHash ? "PIN Set" : "No PIN"}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Push Notifications</p>
              <Badge variant={user.fcmToken ? "default" : "secondary"}>
                {user.fcmToken ? "Enabled" : "Disabled"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Account Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Account Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{transactions.length}</p>
                <p className="text-xs text-muted-foreground">Total Transactions</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{behavioralSessions.length}</p>
                <p className="text-xs text-muted-foreground">Behavioral Sessions</p>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground">Account Age</p>
              <p className="text-sm font-medium">
                {formatDistanceToNow(new Date(user.createdAt))}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Profile Completeness</p>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{
                      width: `${Math.min(100, (
                        (user.fullName ? 15 : 0) +
                        (user.emailId ? 15 : 0) +
                        (user.mobile ? 15 : 0) +
                        (user.bankName ? 15 : 0) +
                        (user.biometricEnabled ? 20 : 0) +
                        (user.recoveryQuestions?.length > 0 ? 20 : 0)
                      ))}%`
                    }}
                  ></div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {Math.min(100, (
                    (user.fullName ? 15 : 0) +
                    (user.emailId ? 15 : 0) +
                    (user.mobile ? 15 : 0) +
                    (user.bankName ? 15 : 0) +
                    (user.biometricEnabled ? 20 : 0) +
                    (user.recoveryQuestions?.length > 0 ? 20 : 0)
                  ))}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Combined Activity Section */}
      <CombinedActivityTable
        transactions={transactions}
        behavioralSessions={behavioralSessions}
        userId={user.id}
      />

      {/* New Sections */}
      <div className="grid gap-6">
        {/* Behavior Profile Section */}
        <BehaviorProfileCard profile={behaviorProfile} />

        {/* Vector Embeddings Section */}
        <VectorEmbeddingsCard embeddings={vectorEmbeddings} />

        {/* Risk Scores Section */}
        <RiskScoresTable userId={user.id} />
      </div>
    </div>
  );
}

// Loading component
export function UserDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-9 w-24" />
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32 mt-2" />
          </div>
        </div>
        <div className="flex space-x-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[...Array(4)].map((_, j) => (
                <Skeleton key={j} className="h-4 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
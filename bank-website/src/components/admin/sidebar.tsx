"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Activity,
  Shield,
  UserPlus,
} from "lucide-react";

const navigation = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    description: "Overview & analytics",
  },
  {
    name: "Users",
    href: "/admin/users",
    icon: Users,
    description: "Manage user accounts",
  },
  {
    name: "Transactions",
    href: "/admin/transactions",
    icon: CreditCard,
    description: "Transaction history",
  },
  {
    name: "Behavioral Sessions",
    href: "/admin/behavioral-sessions",
    icon: Activity,
    description: "Security analysis",
  },
  {
    name: "Register User",
    href: "/admin/register",
    icon: UserPlus,
    description: "Add new user",
  },
];

interface SidebarProps {
  onClose?: () => void;
  className?: string;
}

export function Sidebar({ onClose, className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className={cn("pb-12 min-h-screen bg-sidebar border-r border-sidebar-border", className)}>
      <div className="space-y-6 py-6">
        {/* Logo/Brand */}
        <div className="px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary/70 shadow-lg">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-sidebar-foreground">
                FraudGuard
              </h2>
              <p className="text-xs text-sidebar-foreground/60">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="px-3">
          <p className="px-4 mb-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
            Navigation
          </p>
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-4 py-2.5 text-sm font-medium transition-all duration-200 group",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className={cn(
                    "h-4 w-4 transition-colors flex-shrink-0",
                    isActive ? "text-primary-foreground" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground"
                  )} />
                  <div className="flex flex-col">
                    <span>{item.name}</span>
                    {!isActive && (
                      <span className="text-xs text-sidebar-foreground/40 group-hover:text-sidebar-foreground/60">
                        {item.description}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
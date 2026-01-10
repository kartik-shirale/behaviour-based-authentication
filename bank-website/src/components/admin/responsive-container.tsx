"use client";

import { cn } from "@/lib/utils";

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "grid-2" | "grid-3" | "grid-4" | "stats";
}

export function ResponsiveContainer({ 
  children, 
  className, 
  variant = "default" 
}: ResponsiveContainerProps) {
  const getGridClasses = () => {
    switch (variant) {
      case "grid-2":
        return "grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6";
      case "grid-3":
        return "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6";
      case "grid-4":
        return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6";
      case "stats":
        return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6";
      default:
        return "space-y-4 sm:space-y-6";
    }
  };

  return (
    <div className={cn(getGridClasses(), className)}>
      {children}
    </div>
  );
}

// Responsive wrapper for page headers
export function ResponsivePageHeader({ 
  title, 
  subtitle, 
  actions, 
  className 
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(
      "flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0",
      className
    )}>
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{title}</h1>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center space-x-2">
          {actions}
        </div>
      )}
    </div>
  );
}

// Responsive card grid for consistent layouts
export function ResponsiveCardGrid({ 
  children, 
  columns = "auto", 
  className 
}: {
  children: React.ReactNode;
  columns?: "auto" | 1 | 2 | 3 | 4;
  className?: string;
}) {
  const getColumnClasses = () => {
    switch (columns) {
      case 1:
        return "grid grid-cols-1 gap-4 sm:gap-6";
      case 2:
        return "grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6";
      case 3:
        return "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6";
      case 4:
        return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6";
      default:
        return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6";
    }
  };

  return (
    <div className={cn(getColumnClasses(), className)}>
      {children}
    </div>
  );
}
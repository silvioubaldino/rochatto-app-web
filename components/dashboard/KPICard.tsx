"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  variant?: "default" | "success" | "warning" | "danger";
  icon?: React.ReactNode;
  isLoading?: boolean;
  onClick?: () => void;
}

const variantStyles = {
  default: "border-border",
  success: "border-green-300 bg-green-50",
  warning: "border-yellow-300 bg-yellow-50",
  danger: "border-red-300 bg-red-50",
};

const variantValueStyles = {
  default: "text-foreground",
  success: "text-green-700",
  warning: "text-yellow-700",
  danger: "text-red-700",
};

export function KPICard({
  title,
  value,
  subtitle,
  variant = "default",
  icon,
  isLoading,
  onClick,
}: KPICardProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border p-4 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-7 w-40" />
        {subtitle !== undefined && <Skeleton className="h-3 w-28" />}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border p-4 space-y-1",
        variantStyles[variant],
        onClick && "cursor-pointer hover:shadow-md transition-shadow",
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onClick();
            }
          : undefined
      }
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        {icon && (
          <span className="text-muted-foreground">{icon}</span>
        )}
      </div>
      <p className={cn("text-2xl font-bold", variantValueStyles[variant])}>
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}

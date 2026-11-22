"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { AlertCircle, PackageOpen } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface StateAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

function ActionButton({ action, variant = "default" }: { action: StateAction; variant?: "default" | "outline" }) {
  if (action.href) {
    return (
      <Link href={action.href} className={buttonVariants({ variant })}>
        {action.label}
      </Link>
    );
  }
  return (
    <Button variant={variant} onClick={action.onClick}>
      {action.label}
    </Button>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: string;
  action?: StateAction;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn("flex flex-col items-center justify-center gap-3 px-4 py-12 text-center", className)}
    >
      <div className="text-muted-foreground">{icon ?? <PackageOpen className="size-10" aria-hidden />}</div>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <ActionButton action={action} />}
    </div>
  );
}

export function ErrorState({
  message = "Não foi possível carregar.",
  onRetry,
  className,
}: {
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn("flex flex-col items-center justify-center gap-3 px-4 py-12 text-center", className)}
    >
      <AlertCircle className="size-10 text-danger" aria-hidden />
      <p className="text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Tentar de novo
        </Button>
      )}
    </div>
  );
}

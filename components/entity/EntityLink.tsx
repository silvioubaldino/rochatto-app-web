"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { entityHref, type EntityType } from "./entity-model";
import { hasPreview, isPlainClick, usePeek } from "./EntitySheet";

export interface EntityLinkProps {
  type: EntityType;
  id: string;
  children: ReactNode;
  mode?: "page" | "peek";
  className?: string;
}

export function EntityLink({ type, id, children, mode = "page", className }: EntityLinkProps) {
  const { open } = usePeek();
  const href = entityHref(type, id);
  const peeks = mode === "peek" && hasPreview(type);
  return (
    <Link
      href={href}
      onClick={(e) => {
        if (peeks && isPlainClick(e.nativeEvent)) {
          e.preventDefault();
          open(type, id);
        }
      }}
      className={cn(
        "relative z-10 rounded-sm underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        className,
      )}
    >
      {children}
    </Link>
  );
}

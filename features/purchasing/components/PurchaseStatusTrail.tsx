import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PurchaseStatus } from "@/lib/types";
import { statusTrail } from "../model";

export function PurchaseStatusTrail({ status }: { status: PurchaseStatus }) {
  return (
    <ol aria-label="Andamento da compra" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      {statusTrail(status).map((s, i) => (
        <li key={s.status} aria-current={s.state === "current" ? "step" : undefined} className="flex items-center gap-2">
          {i > 0 && <span aria-hidden className="h-px w-4 bg-border" />}
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-3 py-1",
              s.state === "current" && "bg-primary text-primary-foreground",
              s.state === "done" && "bg-success-subtle text-success",
              s.state === "todo" && "bg-muted text-muted-foreground",
            )}
          >
            {s.state === "done" && <Check className="size-3.5" aria-hidden />}
            {s.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

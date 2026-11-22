"use client";

import { Suspense } from "react";
import { ObligationsView } from "@/components/obligations/ObligationsView";

export default function ReceivablesPage() {
  return (
    <Suspense fallback={null}>
      <ObligationsView direction="RECEIVABLE" />
    </Suspense>
  );
}

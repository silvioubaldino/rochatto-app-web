"use client";

import { Suspense } from "react";
import { ObligationsView } from "@/components/obligations/ObligationsView";

export default function PayablesPage() {
  return (
    <Suspense fallback={null}>
      <ObligationsView direction="PAYABLE" />
    </Suspense>
  );
}

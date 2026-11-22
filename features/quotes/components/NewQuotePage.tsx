"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageSkeleton } from "@/components/patterns/skeletons";
import { QuoteEditor } from "./QuoteEditor";

function Content() {
  const params = useSearchParams();
  return <QuoteEditor initial={{ customerId: params.get("customer_id") ?? "", quick: params.get("rapida") === "1" }} />;
}

/** `/orcamentos/novo[?customer_id=…&rapida=1]` — o mesmo editor, sem orçamento. */
export function NewQuotePage() {
  return (
    <Suspense fallback={<PageSkeleton className="max-w-5xl" />}>
      <Content />
    </Suspense>
  );
}

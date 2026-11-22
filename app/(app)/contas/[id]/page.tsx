"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { PageSkeleton } from "@/components/patterns/skeletons";
import { ObligationPage } from "@/features/finance/components/ObligationPage";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return (
    <Suspense fallback={<PageSkeleton className="max-w-6xl" />}>
      <ObligationPage id={id} />
    </Suspense>
  );
}

"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { PageSkeleton } from "@/components/patterns/skeletons";
import { SalePage } from "@/features/sales/components/SalePage";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return (
    <Suspense fallback={<PageSkeleton className="max-w-6xl" />}>
      <SalePage id={id} />
    </Suspense>
  );
}

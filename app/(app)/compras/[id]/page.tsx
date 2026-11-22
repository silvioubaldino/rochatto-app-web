"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { PageSkeleton } from "@/components/patterns/skeletons";
import { PurchasePage } from "@/features/purchasing/components/PurchasePage";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return (
    <Suspense fallback={<PageSkeleton className="max-w-6xl" />}>
      <PurchasePage id={id} />
    </Suspense>
  );
}

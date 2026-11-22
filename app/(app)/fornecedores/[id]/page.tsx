"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { PageSkeleton } from "@/components/patterns/skeletons";
import { SupplierPage } from "@/features/suppliers/components/SupplierPage";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return (
    <Suspense fallback={<PageSkeleton className="max-w-5xl" />}>
      <SupplierPage id={id} />
    </Suspense>
  );
}

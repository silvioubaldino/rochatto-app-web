"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { PageSkeleton } from "@/components/patterns/skeletons";
import { CustomerPage } from "@/features/customers/components/CustomerPage";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return (
    <Suspense fallback={<PageSkeleton className="max-w-5xl" />}>
      <CustomerPage id={id} />
    </Suspense>
  );
}

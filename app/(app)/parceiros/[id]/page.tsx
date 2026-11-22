"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { PageSkeleton } from "@/components/patterns/skeletons";
import { PartnerPage } from "@/features/partners/components/PartnerPage";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return (
    <Suspense fallback={<PageSkeleton className="max-w-5xl" />}>
      <PartnerPage id={id} />
    </Suspense>
  );
}

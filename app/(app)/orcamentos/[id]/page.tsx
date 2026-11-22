"use client";

import { useParams } from "next/navigation";
import { QuotePage } from "@/features/quotes/components/QuotePage";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <QuotePage id={id} />;
}

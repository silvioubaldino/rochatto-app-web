"use client";

import { PartnersList } from "@/features/partners/components/PartnersList";

export default function Page() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Parceiros</h1>
      <PartnersList />
    </div>
  );
}

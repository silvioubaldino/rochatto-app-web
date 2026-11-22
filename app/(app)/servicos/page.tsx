"use client";

import { ServicesList } from "@/features/catalog/components/ServicesList";

export default function Page() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Serviços</h1>
      <ServicesList />
    </div>
  );
}

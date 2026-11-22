"use client";

import { ServicesTab } from "@/components/catalogs/ServicesTab";

export default function ServicesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Serviços</h1>
      <ServicesTab />
    </div>
  );
}

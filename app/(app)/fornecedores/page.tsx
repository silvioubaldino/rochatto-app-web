"use client";

import { SuppliersTab } from "@/components/catalogs/SuppliersTab";

export default function SuppliersPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Fornecedores e prestadores</h1>
      <SuppliersTab />
    </div>
  );
}

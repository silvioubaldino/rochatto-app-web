"use client";

import { SuppliersList } from "@/features/suppliers/components/SuppliersList";

export default function Page() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Fornecedores e prestadores</h1>
      <SuppliersList />
    </div>
  );
}

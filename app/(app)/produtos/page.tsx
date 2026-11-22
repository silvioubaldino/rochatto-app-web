"use client";

import { Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUrlTab } from "@/components/patterns/useUrlTab";
import { CategoriesList } from "@/features/catalog/components/CategoriesList";
import { ProductsList } from "@/features/catalog/components/ProductsList";

const TABS = ["produtos", "categorias"] as const;
type ProductsTabId = (typeof TABS)[number];

function Content() {
  // Categorias moram dentro de Produtos (AYD-011 §5.1); a aba fica na URL (?tab=).
  const [tab, setTab] = useUrlTab(TABS, "produtos");
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Produtos</h1>
      <Tabs value={tab} onValueChange={(v) => setTab(v as ProductsTabId)}>
        <TabsList>
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
        </TabsList>
        <TabsContent value="produtos" className="mt-4"><ProductsList /></TabsContent>
        <TabsContent value="categorias" className="mt-4"><CategoriesList /></TabsContent>
      </Tabs>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={null}>
      <Content />
    </Suspense>
  );
}

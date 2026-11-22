"use client";

import { CategoriesTab } from "@/components/catalogs/CategoriesTab";
import { ProductsTab } from "@/components/catalogs/ProductsTab";
import { useUrlTab } from "@/components/patterns/useUrlTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS = ["produtos", "categorias"] as const;
type ProductsTabId = (typeof TABS)[number];

export default function ProductsPage() {
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
        <TabsContent value="produtos">
          <ProductsTab />
        </TabsContent>
        <TabsContent value="categorias">
          <CategoriesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

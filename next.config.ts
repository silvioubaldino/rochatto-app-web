import type { NextConfig } from "next";

// Rotas antigas → novas (AYD-011 §5.1 / SPEC-013 U2). A query original é repassada ao destino.
const nextConfig: NextConfig = {
  async redirects() {
    const tab = (value: string) => [{ type: "query" as const, key: "tab", value }];
    return [
      { source: "/dashboard", destination: "/indicadores", permanent: false },
      { source: "/catalogos", has: tab("servicos"), destination: "/servicos", permanent: false },
      { source: "/catalogos", has: tab("categorias"), destination: "/produtos?tab=categorias", permanent: false },
      { source: "/catalogos", has: tab("fornecedores"), destination: "/fornecedores", permanent: false },
      { source: "/catalogos", has: tab("parceiros"), destination: "/parceiros", permanent: false },
      { source: "/catalogos", destination: "/produtos", permanent: false },
      {
        source: "/contas",
        has: [{ type: "query", key: "direction", value: "RECEIVABLE" }],
        destination: "/contas/receber",
        permanent: false,
      },
      { source: "/contas", destination: "/contas/pagar", permanent: false },
    ];
  },
};

export default nextConfig;

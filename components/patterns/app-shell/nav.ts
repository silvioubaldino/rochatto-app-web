// Navegação do app: grupos, item ativo e barra inferior do celular — puro e testado.
// Estrutura de AYD-011 §5.1 (U2). Trocar uma rota = mudar `href` aqui e em `entityHref`.

export type NavIconName =
  | "home"
  | "indicators"
  | "quotes"
  | "sales"
  | "customers"
  | "partners"
  | "purchases"
  | "stock"
  | "suppliers"
  | "receivables"
  | "payables"
  | "movements"
  | "results"
  | "products"
  | "services"
  | "integrations";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: NavIconName;
  /** Rotas extras que também deixam o item ativo. */
  alsoActiveFor?: readonly string[];
}

export interface NavGroup {
  id: string;
  label: string;
  items: readonly NavItem[];
}

export const NAV_GROUPS: readonly NavGroup[] = [
  {
    id: "home",
    label: "Início",
    items: [
      { id: "today", label: "Hoje", href: "/hoje", icon: "home" },
      { id: "indicators", label: "Indicadores", href: "/indicadores", icon: "indicators" },
    ],
  },
  {
    id: "commercial",
    label: "Comercial",
    items: [
      { id: "quotes", label: "Orçamentos", href: "/orcamentos", icon: "quotes" },
      { id: "sales", label: "Vendas", href: "/vendas", icon: "sales" },
      { id: "customers", label: "Clientes", href: "/clientes", icon: "customers" },
      { id: "partners", label: "Parceiros", href: "/parceiros", icon: "partners" },
    ],
  },
  {
    id: "operations",
    label: "Operação",
    items: [
      { id: "purchases", label: "Compras", href: "/compras", icon: "purchases" },
      { id: "stock", label: "Estoque", href: "/estoque", icon: "stock" },
      { id: "suppliers", label: "Fornecedores e prestadores", href: "/fornecedores", icon: "suppliers" },
    ],
  },
  {
    id: "finance",
    label: "Financeiro",
    items: [
      { id: "receivables", label: "A receber", href: "/contas/receber", icon: "receivables" },
      { id: "payables", label: "A pagar", href: "/contas/pagar", icon: "payables" },
      { id: "movements", label: "Movimentações", href: "/movimentacoes", icon: "movements" },
      { id: "results", label: "Resultado", href: "/financeiro", icon: "results" },
    ],
  },
  {
    id: "registries",
    label: "Cadastros",
    items: [
      { id: "products", label: "Produtos", href: "/produtos", icon: "products" },
      { id: "services", label: "Serviços", href: "/servicos", icon: "services" },
    ],
  },
];

/** Configuração rara: fica no menu do usuário / "Mais", não no menu principal. */
export const USER_MENU_ITEMS: readonly NavItem[] = [
  { id: "integrations", label: "Integrações", href: "/integracoes", icon: "integrations" },
];

/** Barra inferior do celular: Hoje · Orçamentos · ＋ · Vendas · Mais (AYD-011 §5.1). */
export const BOTTOM_BAR_IDS = ["today", "quotes", "new", "sales", "more"] as const;
export type BottomBarId = (typeof BOTTOM_BAR_IDS)[number];

export function allNavItems(): NavItem[] {
  return [...NAV_GROUPS.flatMap((g) => g.items), ...USER_MENU_ITEMS];
}

export function findNavItem(id: string): NavItem | undefined {
  return allNavItems().find((i) => i.id === id);
}

/** O item está ativo para este caminho? `/vendas/abc` ativa "Vendas"; `/vendas-x` não. */
export function isNavActive(item: Pick<NavItem, "href" | "alsoActiveFor">, pathname: string): boolean {
  const hrefs = [item.href, ...(item.alsoActiveFor ?? [])];
  return hrefs.some((h) => pathname === h || pathname.startsWith(`${h}/`));
}

/** O item "Mais" fica ativo quando a rota é de algum item que NÃO está na barra. */
export function isMoreActive(pathname: string): boolean {
  const inBar = new Set<string>(BOTTOM_BAR_IDS);
  return allNavItems().some((i) => !inBar.has(i.id) && isNavActive(i, pathname));
}

export interface NewMenuEntry {
  id: string;
  label: string;
  /** Rota (sem diálogo). */
  href?: string;
  /** Abre o cadastro rápido deste tipo, sem sair da tela. */
  quickCreate?: "customer" | "product" | "supplier" | "partner" | "service";
}

/** Menu "＋ Novo" (UX-P02): cada entrada abre um fluxo real, sem sair da tela quando é cadastro. */
export const NEW_MENU: readonly NewMenuEntry[] = [
  { id: "quote", label: "Orçamento", href: "/orcamentos/novo" },
  { id: "quick-sale", label: "Venda rápida", href: "/orcamentos/novo?rapida=1" },
  { id: "receive", label: "Receber", href: "/contas/receber" },
  { id: "pay", label: "Pagar", href: "/contas/pagar" },
  { id: "expense", label: "Despesa", href: "/movimentacoes?nova=despesa" },
  { id: "customer", label: "Cliente", quickCreate: "customer" },
  { id: "product", label: "Produto", quickCreate: "product" },
  { id: "supplier", label: "Fornecedor ou prestador", quickCreate: "supplier" },
  { id: "partner", label: "Parceiro", quickCreate: "partner" },
];

// Regras puras da "cola de entidade": rotas, prévia na URL, busca/ordenação de opções.

/** Entidades que o dono ESCOLHE num campo (combobox) e CRIA sem sair da tela (quick-create). */
export type EntityKind = "customer" | "product" | "service" | "supplier" | "partner";

/** Entidades que têm LINK e podem ter prévia. */
export type EntityType = EntityKind | "quote" | "sale" | "purchase" | "obligation";

export const ENTITY_TYPES: readonly EntityType[] = [
  "customer",
  "product",
  "service",
  "supplier",
  "partner",
  "quote",
  "sale",
  "purchase",
  "obligation",
];

/** Nome da entidade na linguagem do dono (singular, minúsculo) — "Criar cliente 'Fulano'". */
export const ENTITY_LABELS: Record<EntityType, string> = {
  customer: "cliente",
  product: "produto",
  service: "serviço",
  supplier: "fornecedor",
  partner: "parceiro",
  quote: "orçamento",
  sale: "venda",
  purchase: "compra",
  obligation: "conta",
};

/**
 * Página da entidade. ÚNICO lugar onde isso é definido: as fases U4–U5 criam páginas novas
 * (`/fornecedores/[id]` 360…) e só mudam este mapa. Produto, serviço e fornecedor ainda
 * abrem a lista do cadastro.
 */
export function entityHref(type: EntityType, id: string): string {
  switch (type) {
    case "customer":
      return `/clientes/${id}`;
    case "quote":
      return `/orcamentos/${id}`;
    case "sale":
      return `/vendas/${id}`;
    case "purchase":
      return `/compras/${id}`;
    case "obligation":
      return `/contas/${id}`;
    case "product":
      return `/produtos`;
    case "service":
      return `/servicos`;
    case "supplier":
      return `/fornecedores`;
    case "partner":
      return `/parceiros/${id}`;
  }
}

// --- Prévia na URL: ?peek=sale:<id> ----------------------------------------------------

export const PEEK_PARAM = "peek";

export interface PeekRef {
  type: EntityType;
  id: string;
}

export function formatPeek(ref: PeekRef): string {
  return `${ref.type}:${ref.id}`;
}

/** `sale:abc` → `{ type: "sale", id: "abc" }`; qualquer coisa inválida → null. */
export function parsePeek(value: string | null | undefined): PeekRef | null {
  if (!value) return null;
  const i = value.indexOf(":");
  if (i <= 0) return null;
  const type = value.slice(0, i) as EntityType;
  const id = value.slice(i + 1);
  if (!ENTITY_TYPES.includes(type) || !id || /[\s/?#&]/.test(id)) return null;
  return { type, id };
}

/** Query string (sem "?") com `peek` aplicado/removido, preservando os outros parâmetros. */
export function peekQuery(current: URLSearchParams | string, ref: PeekRef | null): string {
  const params = new URLSearchParams(typeof current === "string" ? current : current.toString());
  if (ref) params.set(PEEK_PARAM, formatPeek(ref));
  else params.delete(PEEK_PARAM);
  return params.toString();
}

// --- Opções de combobox ---------------------------------------------------------------

/** Minúsculo, sem acento e sem espaços nas pontas: "Mármore " → "marmore". */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export interface RankableOption {
  id: string;
  label: string;
}

/**
 * Filtra por `query` (contém, sem acento/caixa) e ordena: preferidos (contexto — ex.: kind
 * STONE para fornecedor de Item) → recentes → começa-com → contém → ordem original.
 */
export function rankOptions<T extends RankableOption>(
  options: readonly T[],
  query: string,
  context: { prefer?: (option: T) => boolean; recents?: readonly string[] } = {},
): T[] {
  const q = normalizeText(query);
  const recents = context.recents ?? [];
  const scored = options
    .map((option, index) => {
      const label = normalizeText(option.label);
      const at = q ? label.indexOf(q) : 0;
      return { option, index, at };
    })
    .filter((x) => x.at >= 0);
  const score = (x: (typeof scored)[number]) => {
    const preferred = context.prefer?.(x.option) ? 0 : 1;
    const recent = recents.indexOf(x.option.id);
    const recentRank = recent >= 0 ? recent : recents.length + 1;
    const starts = q && x.at === 0 ? 0 : 1;
    return [preferred, q ? starts : recentRank, q ? recentRank : 0, x.index] as const;
  };
  return scored
    .sort((a, b) => {
      const sa = score(a);
      const sb = score(b);
      for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return sa[i] - sb[i];
      return 0;
    })
    .map((x) => x.option);
}

/** Mostra "＋ Criar …" para este texto? (há texto e nenhuma opção com o MESMO nome.) */
export function shouldOfferCreate(query: string, options: readonly RankableOption[]): boolean {
  const q = normalizeText(query);
  if (!q) return false;
  return !options.some((o) => normalizeText(o.label) === q);
}

export function createOptionLabel(kind: EntityKind, query: string): string {
  const name = query.trim();
  return name ? `＋ Criar ${ENTITY_LABELS[kind]} "${name}"` : `＋ Criar ${ENTITY_LABELS[kind]}`;
}

/** Recentes: o id escolhido vai para o início, sem repetir, no máximo `max`. */
export function pushRecent(recents: readonly string[], id: string, max = 8): string[] {
  return [id, ...recents.filter((r) => r !== id)].slice(0, max);
}

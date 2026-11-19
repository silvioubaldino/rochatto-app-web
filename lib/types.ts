// Enums
// Atendimento da Sale — AYD-002. Enums do contrato em inglês (ADR-001); rótulos PT-BR em
// lib/formatters.ts (nunca exibir o código do enum).
export type ItemOrigin = "MADE_TO_ORDER" | "FROM_STOCK";
/** Tipo do Item de Quote/Sale (AYD-010): Product (pedra) ou Service (instalação, consultoria). */
export type ItemKind = "PRODUCT" | "SERVICE";
export type PurchaseKind = "MADE_TO_ORDER" | "STOCK_REPLENISHMENT";
export type PurchaseStatus = "OPEN" | "ORDERED" | "RECEIVED";
/** Status de entrega da Sale (manual) — substitui o `status_venda` legado. */
export type SaleDeliveryStatus = "TO_DELIVER" | "DELIVERED" | "CANCELED";
/** Status de pagamento da Sale — calculado pela API a partir da conta a receber, nunca enviado. */
export type SalePaymentStatus = "PENDING" | "PARTIAL" | "PAID";
/** Forma de pagamento — AYD-004. Rótulos PT-BR em lib/formatters.ts. */
export type PaymentMethod = "PIX" | "CASH" | "CARD" | "BOLETO" | "TRANSFER";
export type StockAdjustmentReason = "INITIAL" | "COUNT" | "OTHER";
/** Avisos não bloqueantes devolvidos ao gravar um Item de Sale. */
export type SaleItemWarning = "INSUFFICIENT_STOCK";

// Cadastros comerciais — AYD-003. Campos/rotas novos em inglês (ADR-001).
export type PartnerType = "ARCHITECT" | "ENGINEER" | "BUILDER" | "OTHER";
export type LeadSource = "REFERRAL" | "INSTAGRAM" | "PARTNER" | "OTHER";

/** Partner (referrer) — `/partners`, substitui o legado `/vendedores-externos`. */
export interface Partner {
  id: string;
  name: string;
  phone: string | null;
  type: PartnerType;
  notes: string | null;
  created_at: string;
}

/** Product category — `/product-categories` (ordem alfabética). */
export interface ProductCategory {
  id: string;
  name: string;
  created_at: string;
}

// Entidades base
export interface Cliente {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  cidade?: string;
  observacoes?: string;
  // AYD-003: lead source (opcional; Customers antigos = null)
  lead_source?: LeadSource | null;
  referrer_id?: string | null;
  referrer_name?: string | null;
  created_at: string;
}

export interface Produto {
  id: string;
  nome: string;
  descricao?: string;
  preco_referencia?: number;
  custo_referencia?: number;
  unidade?: string;
  // AYD-003: categoria (category_name vem mesmo se a categoria foi excluída)
  category_id?: string | null;
  category_name?: string | null;
  created_at: string;
}

/** Service (Serviço) do catálogo — AYD-010 §1. */
export interface Service {
  id: string;
  name: string;
  unit: string | null;
  reference_price: number | null;
  reference_cost: number | null;
  notes: string | null;
  created_at: string;
}

export interface Fornecedor {
  id: string;
  nome: string;
  /** AYD-007: tipo do credor (Fornecedores e prestadores). */
  kind: SupplierKind;
  telefone?: string;
  cidade?: string;
  observacoes?: string;
  created_at: string;
}

export interface ItemVenda {
  id: string;
  venda_id: string;
  produto_id?: string;
  produto_nome: string;
  fornecedor_id?: string;
  fornecedor_nome?: string;
  quantidade: number;
  preco_venda_unit: number;
  custo_unit: number;
  total_venda: number;
  total_custo: number;
  // AYD-002: origem do Item e Purchase que o atende (só leitura; setado pela Purchase).
  // AYD-010: Item de serviço não tem origem (null), Supplier nem Purchase.
  origin: ItemOrigin | null;
  purchase_id: string | null;
  /** AYD-010: ausente em respostas antigas = PRODUCT. */
  kind?: ItemKind;
  service_id?: string | null;
}

/** Resposta de POST/PUT /vendas/{id}/itens[/{itemId}] — o Item + avisos (AYD-002 §1). */
export interface ItemVendaWriteResponse extends ItemVenda {
  warnings?: SaleItemWarning[] | null;
}

export interface Venda {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  // Legado: aponta para o mesmo registro do Partner (AYD-003 — mesmos IDs).
  vendedor_externo_id?: string;
  vendedor_externo_nome?: string;
  quote_id?: string;
  // AYD-002: status de entrega (manual, via PATCH) e de pagamento (calculado).
  delivery_status: SaleDeliveryStatus;
  payment_status: SalePaymentStatus;
  data_venda: string;
  data_entrega_prevista?: string;
  observacoes?: string;
  total_venda: number;
  total_custo: number;
  // AYD-007 §6: saldos vêm da conta RECEIVABLE da Sale (calculados, nunca enviados).
  total_recebido: number;
  a_receber: number;
  /** RN-05: max(total_venda − total_recebido, 0) */
  receivable: number;
  lucro: number;
  itens?: ItemVenda[];
  // AYD-009 §3: composição do preço e dos custos; `costs_paid`/`costs_open` somam as contas a pagar.
  composition?: SaleComposition;
  costs_paid?: number;
  costs_open?: number;
  obligations?: Obligation[];
  created_at: string;
}

// Composição da venda — AYD-009 (RF-40). Contrato em inglês (ADR-001).
export type SaleChargeKind = "FREIGHT" | "OTHER";
export type SaleCostKind = "FREIGHT" | "LABOR" | "COMMISSION" | "OTHER";

/** Cobrança adicional ao cliente (Sale charge / Quote charge), ex.: frete cobrado. */
export interface SaleCharge {
  id: string;
  kind: SaleChargeKind;
  amount: number;
  description: string | null;
}

export interface SalePayee {
  type: "SUPPLIER" | "PARTNER";
  id: string;
  name: string;
}

/** Custo da venda (Sale cost): previsto e editável; `payee` null = "a definir". */
export interface SaleCost {
  id: string;
  sale_id: string;
  kind: SaleCostKind;
  amount: number;
  description: string | null;
  payee: SalePayee | null;
  sale_item_id: string | null;
  obligation_id: string | null;
  /** 200 com avisos quando o novo valor/credor deixa a conta com quitado > devido. */
  warnings?: ObligationWarning[];
}

export interface SaleComposition {
  items_total: number;
  charges: SaleCharge[];
  charges_total: number;
  /** items_total + charges_total (= total_venda). */
  price_total: number;
  costs: SaleCost[];
  costs_total: number;
}

// Quote (Orçamento) — AYD-001. Contrato em inglês (ADR-001), rótulos em PT-BR na UI.
export type QuoteStatus = "OPEN" | "WON" | "LOST";

export interface QuoteItem {
  id: string;
  quote_id: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  total_price: number;
  /** AYD-010: ausente em respostas antigas = PRODUCT. */
  kind?: ItemKind;
  service_id?: string | null;
  created_at: string;
}

export interface Quote {
  id: string;
  customer_id: string;
  customer_name: string;
  referrer_id?: string;
  referrer_name?: string;
  status: QuoteStatus;
  lost_reason?: string;
  quote_date: string;
  notes?: string;
  total_quote: number;
  /** AYD-009: cobranças ao cliente (frete cobrado); `total_quote` inclui as cobranças. */
  charges?: SaleCharge[];
  /** AYD-005: true se o Quote nasceu da venda rápida (somente leitura). */
  quick_sale: boolean;
  items?: QuoteItem[];
  created_at: string;
}

// Dashboard — AYD-005

/** `GET /dashboard/kpis?from&to` (blocos `sales` e `balances` = os de `/finance/summary`). */
export interface DashboardKpis {
  period: { from: string; to: string };
  sales: {
    count: number;
    revenue: number;
    profit: number;
    /** revenue / count; 0 se count = 0. */
    average_ticket: number;
  };
  /** Coorte de Quotes emitidos no período, sem vendas rápidas. */
  quotes: {
    created: number;
    won: number;
    lost: number;
    open: number;
    /** won / created (0..1); null se created = 0. */
    conversion_rate: number | null;
  };
  /** Mesmo bloco `balances` de `/finance/summary` (AYD-007 §6). */
  balances: FinanceBalancesBlock;
  open_deliveries: number;
}

export type NotificacaoTipo =
  | "pagamento_vencido"
  | "pagamento_vencendo"
  | "conta_pagar_vencida"
  | "conta_pagar_vencendo";

export interface Notificacao {
  id: string;
  tipo: NotificacaoTipo;
  venda_id: string | null;
  /** AYD-007: conta a que o alerta se refere (abre /contas/{id}); installment_id quando vem de parcela. */
  obligation_id?: string | null;
  installment_id?: string | null;
  cliente_nome: string;
  valor: number;
  data_ref: string;
  dias_restantes: number | null;
  lida: boolean;
}

export interface VendasPorMes {
  /** Primeiro dia do mês, `YYYY-MM-01`. */
  mes: string;
  total_venda: number;
  lucro: number;
  sales_count: number;
}

export interface ProdutoMaisVendido {
  /** null = Item legado sem Product (agrupado por nome). */
  produto_id: string | null;
  produto_nome: string;
  /** Nº de Sales distintas. */
  total_vendas: number;
  total_quantidade: number;
  total_receita: number;
  preco_medio: number;
  custo_medio: number;
  margem_media_percent: number;
  /** Unidade do Product; null em Item legado. */
  unit: string | null;
}

/** Linha de `GET /relatorios/servicos?from&to` (AYD-010 §3). */
export interface ServicoMaisVendido {
  /** null = Item de serviço em texto livre (agrupado por nome). */
  service_id: string | null;
  service_name: string;
  unit: string | null;
  total_vendas: number;
  total_quantidade: number;
  total_receita: number;
  preco_medio: number;
  custo_medio: number;
  margem_media_percent: number;
}

export interface ServicosMaisVendidosResponse {
  dados: ServicoMaisVendido[];
}

// Purchase — AYD-002 §3 (`/purchases`).

/** Item de Sale (made-to-order) anexado a uma Purchase. */
export interface PurchaseSaleItem {
  id: string;
  sale_id: string;
  customer_name: string;
  produto_nome: string;
  quantidade: number;
  custo_unit: number;
}

/** Linha de reposição de Stock (só Purchase STOCK_REPLENISHMENT). */
export interface PurchaseItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
}

export type PurchaseChargeKind = "FREIGHT" | "UNLOADING" | "TAX" | "OTHER";
export type AllocationMethod = "BY_QUANTITY" | "BY_VALUE";
export type PurchaseWarning = "OVERSETTLED";

export interface PurchaseCharge {
  id: string;
  purchase_id: string;
  kind: PurchaseChargeKind;
  amount: number;
  description: string | null;
  payee_supplier_id: string | null;
  payee_name: string | null;
  obligation_id: string | null;
  created_at?: string;
  warnings?: PurchaseWarning[];
}

export interface PurchaseComposition {
  goods_total: number;
  charges: PurchaseCharge[];
  charges_total: number;
  total: number;
}

export interface PurchaseLine {
  line_type: "STOCK_ITEM" | "SALE_ITEM";
  line_id: string;
  product_id: string | null;
  product_name: string;
  unit: string | null;
  quantity: number;
  unit_cost: number;
  base_cost: number;
  allocated_charges: number;
  landed_total: number;
  landed_unit_cost: number;
}

export interface PurchaseDetail {
  id: string;
  kind: PurchaseKind;
  status: PurchaseStatus;
  supplier_id: string;
  supplier_name: string;
  expected_date: string | null;
  notes: string | null;
  ordered_at: string | null;
  received_at: string | null;
  total_cost: number;
  /** AYD-007 §6: Σ em aberto das contas PAYABLE da compra (calculado). */
  payable: number;
  /** AYD-007 §6: Σ quitado das contas PAYABLE da compra (calculado). */
  paid: number;
  sale_items: PurchaseSaleItem[];
  items: PurchaseItem[];
  created_at?: string;
  allocation_method: AllocationMethod;
  composition: PurchaseComposition;
  obligations: Obligation[];
  open: number;
  lines: PurchaseLine[];
  warnings?: PurchaseWarning[];
}

/**
 * Linha de GET /purchases. ASSUNÇÃO (o AYD só diz "lista"): mesmos campos do
 * PurchaseDetail; as linhas (`sale_items`/`items`) podem vir ou não.
 */
export type PurchaseListItem = Omit<
  PurchaseDetail,
  "sale_items" | "items" | "composition" | "obligations" | "lines" | "open" | "allocation_method"
> &
  Partial<
    Pick<
      PurchaseDetail,
      "sale_items" | "items" | "composition" | "obligations" | "lines" | "open" | "allocation_method"
    >
  >;

/** Resposta de PATCH /purchases/{id}/status. */
export interface PurchaseStatusResponse {
  id: string;
  status: PurchaseStatus;
  ordered_at: string | null;
  received_at: string | null;
}

/**
 * GET /purchases/pending-sale-items — fila "a comprar" (RF-31).
 * ASSUNÇÃO de forma (o AYD diz só "agrupados por Supplier"): array de grupos; um grupo com
 * `supplier_id: null` reúne os Items ainda sem Supplier, se a API o devolver.
 */
export interface PendingSaleItem {
  id: string;
  sale_id: string;
  customer_name: string;
  produto_id: string | null;
  produto_nome: string;
  quantidade: number;
  custo_unit: number;
  sale_date: string;
}

export interface PendingSaleItemGroup {
  supplier_id: string | null;
  supplier_name: string | null;
  items: PendingSaleItem[];
}

// Stock — AYD-002 §4 (`/stock`). Substitui o legado `/estoque`.

export interface StockBalance {
  product_id: string;
  product_name: string;
  unit: string | null;
  inflow_qty: number;
  outflow_qty: number;
  adjustment_qty: number;
  balance: number;
  last_inflow_cost: number | null;
  last_inflow_date: string | null;
  stock_value: number;
}

export type StockMovementKind = "INFLOW" | "OUTFLOW" | "ADJUSTMENT";

/**
 * Linha do extrato. ASSUNÇÃO (o AYD diz só "entradas, saídas, ajustes"): `quantity` vem
 * com sinal (saída negativa, ajuste ±); `reference_id` = Purchase (INFLOW), Sale (OUTFLOW)
 * ou ajuste (ADJUSTMENT).
 */
export interface StockMovement {
  kind: StockMovementKind;
  date: string;
  quantity: number;
  unit_cost: number | null;
  reference_id: string | null;
  description: string | null;
}

/** GET /stock/balance/{productId} — Balance + extrato. */
export interface StockStatement extends StockBalance {
  movements: StockMovement[];
}

/** GET /stock/adjustments. ASSUNÇÃO: a resposta traz `product_name`. */
export interface StockAdjustment {
  id: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  unit_cost: number | null;
  reason: StockAdjustmentReason;
  adjusted_at: string;
  notes: string | null;
  created_at: string;
}

// Financeiro — AYD-004 (`GET /finance/summary`). Campos em inglês (ADR-001).

export interface FinanceSalesBlock {
  count: number;
  revenue: number;
  cost: number;
  profit: number;
  received: number;
  receivable: number;
}

export interface FinanceReceivedByMethod {
  /** null = movimentação sem forma de pagamento ("Não informado") */
  payment_method: PaymentMethod | null;
  amount: number;
}

/** ASSUNÇÃO (o AYD diz só `by_category[]`): `{ category, amount }`. */
export interface FinanceCategoryAmount {
  category: MovementCategory;
  amount: number;
}

/** AYD-007 §6: movimentações do período. */
export interface FinanceCashBlock {
  inflow: number;
  outflow: number;
  net: number;
  by_category: FinanceCategoryAmount[];
  received_by_method: FinanceReceivedByMethod[];
}

/** Movimentações SEM quitação de categoria de despesa. */
export interface FinanceExpensesBlock {
  total: number;
  by_category: FinanceCategoryAmount[];
}

/** RN-17: resultado do período = Profit das Sales − despesas. */
export interface FinanceResultBlock {
  sales_profit: number;
  expenses: number;
  net_result: number;
}

export interface FinancePayableByKind {
  kind: SupplierKind;
  open: number;
}

/** Σ `open` das contas (PAYABLE = compras + custos de venda). */
export interface FinanceBalancesBlock {
  receivable: number;
  payable: number;
  payable_by_counterparty_kind: FinancePayableByKind[];
}

export interface FinanceSummary {
  period: { from: string; to: string };
  sales: FinanceSalesBlock;
  cash: FinanceCashBlock;
  expenses: FinanceExpensesBlock;
  result: FinanceResultBlock;
  balances: FinanceBalancesBlock;
}

// Contas e movimentações — AYD-007. Enums do contrato em inglês (ADR-001); rótulos PT-BR em
// lib/formatters.ts (nunca exibir o código do enum).
export type SupplierKind = "STONE" | "TRANSPORT" | "LABOR" | "TAX_AUTHORITY" | "OTHER";
export type ObligationDirection = "PAYABLE" | "RECEIVABLE";
/** Calculado pela API: quitado = 0 / parcial / ≥ valor. */
export type ObligationStatus = "OPEN" | "PARTIAL" | "SETTLED";
/** Calculado pela API por cobertura. */
export type InstallmentStatus = "OPEN" | "PARTIAL" | "COVERED";
export type MovementCategory =
  | "SALE_RECEIPT"
  | "OTHER_INCOME"
  | "PURCHASE_PAYMENT"
  | "FREIGHT"
  | "LABOR"
  | "COMMISSION"
  | "VEHICLE"
  | "TAXES"
  | "FIXED_COSTS"
  | "MARKETING"
  | "BANK_FEES"
  | "OTHER_EXPENSE";
export type ObligationOriginType = "SALE" | "PURCHASE";
export type CounterpartyType = "SUPPLIER" | "PARTNER" | "CUSTOMER";
/** Fontes de componentes antes do AYD-008/009 (§7a); os AYDs seguintes acrescentam tipos. */
export type ObligationComponentType =
  | "SALE_ITEMS"
  | "LEGACY_FREIGHT"
  | "LEGACY_COMMISSION"
  | "PURCHASE_ITEMS";
/** Avisos não bloqueantes (HTTP 2xx com `warnings[]`). */
export type ObligationWarning = "MIXED_COUNTERPARTIES" | "OVERSETTLED";

export interface ObligationComponent {
  /** Um `ObligationComponentType`; tipos futuros (AYD-008/009) chegam como string e usam `label`. */
  type: ObligationComponentType | (string & {});
  id: string;
  label: string;
  amount: number;
}

export interface Installment {
  id: string;
  due_date: string;
  amount: number;
  payment_method: PaymentMethod | null;
  notes: string | null;
  covered: number;
  status: InstallmentStatus;
  overdue: boolean;
}

/** Linha do plano enviada em `PUT /obligations/{id}/installments`. */
export interface InstallmentInput {
  due_date: string;
  amount: number;
  payment_method?: PaymentMethod;
  notes?: string;
}

export interface MovementSettlement {
  id: string;
  obligation_id: string;
  amount: number;
}

export interface FinancialMovement {
  id: string;
  occurred_on: string;
  /** > 0 entrada, < 0 saída, ≠ 0 */
  amount: number;
  category: MovementCategory;
  payment_method: PaymentMethod | null;
  counterparty_name: string | null;
  description: string | null;
  settlements: MovementSettlement[];
  /** |amount| − Σ settlements (≥ 0) */
  unallocated: number;
  created_at: string;
  corrected_at: string | null;
}

/** Quitação como aparece no detalhe da conta (movimentação em resumo). */
export interface ObligationSettlement {
  id: string;
  amount: number;
  movement: Pick<
    FinancialMovement,
    "id" | "occurred_on" | "amount" | "category" | "payment_method"
  > &
    Partial<Pick<FinancialMovement, "counterparty_name" | "description">>;
}

export interface Obligation {
  id: string;
  direction: ObligationDirection;
  origin: { type: ObligationOriginType; id: string; label: string };
  /** null = credor "a definir". */
  counterparty: { type: CounterpartyType; id: string; name: string } | null;
  amount: number;
  settled: number;
  open: number;
  status: ObligationStatus;
  due_date: string | null;
  overdue: boolean;
  next_installment: { due_date: string; amount_open: number } | null;
  notes: string | null;
  // só no detalhe
  components?: ObligationComponent[];
  installments?: Installment[];
  settlements?: ObligationSettlement[];
  warnings?: ObligationWarning[];
}

/** Lista paginada do AYD-007 (`total`, `offset`, `has_more` + `totals` por recurso). */
export interface Paged<T, Totals> {
  items: T[];
  totals: Totals;
  total: number;
  offset: number;
  has_more: boolean;
}

export interface ObligationTotals {
  amount: number;
  settled: number;
  open: number;
}

export interface MovementTotals {
  inflow: number;
  outflow: number;
  net: number;
}

export type ObligationList = Paged<Obligation, ObligationTotals>;
export type FinancialMovementList = Paged<FinancialMovement, MovementTotals>;

/** Resposta (201) de `POST /settlements` e de `POST /obligations/{id}/settle`. */
export interface SettlementResponse {
  movement: FinancialMovement;
  obligations: Obligation[];
  warnings?: ObligationWarning[];
}

// Respostas de API (Wrappers)
export interface NotificacoesResponse {
  total: number;
  notificacoes: Notificacao[];
}

export interface VendasPorMesResponse {
  dados: VendasPorMes[];
}

export interface ProdutosMaisVendidosResponse {
  dados: ProdutoMaisVendido[];
}

// Assistant connector (AYD-006 §2.3–2.7)
export type ConnectionScope = "read" | "write";

/** `GET /oauth/authorization-requests/{id}` — pedido de conexão a consentir. */
export interface AuthorizationRequest {
  id: string;
  client_name: string;
  /** Host do `redirect_uri`, para o dono conferir. */
  redirect_host: string;
  scopes: ConnectionScope[];
  expires_at: string;
}

/** Resposta de `approve` / `deny`: o web navega para `redirect_to`. */
export interface AuthorizationDecision {
  redirect_to: string;
}

/** `GET /oauth/connections` — Connection ativa (não revogada). */
export interface Connection {
  id: string;
  client_name: string;
  scopes: ConnectionScope[];
  created_at: string;
  last_used_at: string | null;
}

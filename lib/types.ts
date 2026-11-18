// Enums
export type StatusPagamento = "pendente" | "recebido";

// Atendimento da Sale — AYD-002. Enums do contrato em inglês (ADR-001); rótulos PT-BR em
// lib/formatters.ts (nunca exibir o código do enum).
export type ItemOrigin = "MADE_TO_ORDER" | "FROM_STOCK";
export type PurchaseKind = "MADE_TO_ORDER" | "STOCK_REPLENISHMENT";
export type PurchaseStatus = "OPEN" | "ORDERED" | "RECEIVED";
export type SupplierPaymentStatus = "PENDING" | "PAID";
/** Status de entrega da Sale (manual) — substitui o `status_venda` legado. */
export type SaleDeliveryStatus = "TO_DELIVER" | "DELIVERED" | "CANCELED";
/** Status de pagamento da Sale — calculado dos Receipts pela API (view), nunca enviado. */
export type SalePaymentStatus = "PENDING" | "PARTIAL" | "PAID";
/** Forma de pagamento do Receipt — AYD-004. Rótulos PT-BR em lib/formatters.ts. */
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

export interface Fornecedor {
  id: string;
  nome: string;
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
  origin: ItemOrigin;
  purchase_id: string | null;
}

/** Resposta de POST/PUT /vendas/{id}/itens[/{itemId}] — o Item + avisos (AYD-002 §1). */
export interface ItemVendaWriteResponse extends ItemVenda {
  warnings?: SaleItemWarning[] | null;
}

export interface PagamentoCliente {
  id: string;
  venda_id: string;
  valor: number;
  data_pagamento?: string;
  data_agendada?: string;
  status: StatusPagamento;
  // AYD-004: obrigatório ao receber; null em Receipts legados ou ainda pendentes.
  payment_method: PaymentMethod | null;
  observacoes?: string;
  created_at: string;
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
  frete_valor: number;
  frete_pago: number;
  comissao_valor: number;
  comissao_paga: boolean;
  observacoes?: string;
  total_venda: number;
  total_custo: number;
  total_recebido: number;
  a_receber: number;
  a_pagar_frete: number;
  // AYD-004 (vw_vendas_resumo): saldos calculados, nunca enviados.
  /** RN-05: max(total_venda − total_recebido, 0) */
  receivable: number;
  /** RF-10: max(frete_valor − frete_pago, 0) */
  freight_payable: number;
  lucro: number;
  itens?: ItemVenda[];
  pagamentos?: PagamentoCliente[];
  created_at: string;
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
  balances: {
    receivable: number;
    payable_to_suppliers: number;
    commission_payable: number;
    freight_payable: number;
  };
  open_deliveries: number;
}

export interface Notificacao {
  id: string;
  tipo: "pagamento_vencido" | "pagamento_vencendo";
  venda_id: string | null;
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
  payment_status: SupplierPaymentStatus;
  paid_amount: number | null;
  paid_at: string | null;
  total_cost: number;
  to_pay: number;
  sale_items: PurchaseSaleItem[];
  items: PurchaseItem[];
  created_at?: string;
}

/**
 * Linha de GET /purchases. ASSUNÇÃO (o AYD só diz "lista"): mesmos campos do
 * PurchaseDetail; as linhas (`sale_items`/`items`) podem vir ou não.
 */
export type PurchaseListItem = Omit<PurchaseDetail, "sale_items" | "items"> &
  Partial<Pick<PurchaseDetail, "sale_items" | "items">>;

/** Resposta de PATCH /purchases/{id}/status. */
export interface PurchaseStatusResponse {
  id: string;
  status: PurchaseStatus;
  ordered_at: string | null;
  received_at: string | null;
}

/** Resposta de PATCH /purchases/{id}/payment. */
export interface PurchasePaymentResponse {
  id: string;
  payment_status: SupplierPaymentStatus;
  paid_amount: number | null;
  paid_at: string | null;
  to_pay: number;
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
  freight: number;
  commission: number;
  profit: number;
  received: number;
  receivable: number;
}

export interface FinanceReceivedByMethod {
  /** null = Receipt legado "Não informado" */
  payment_method: PaymentMethod | null;
  amount: number;
}

export interface FinanceCashBlock {
  received: number;
  received_by_method: FinanceReceivedByMethod[];
  paid_to_suppliers: number;
}

export interface FinanceBalancesBlock {
  receivable: number;
  payable_to_suppliers: number;
  freight_payable: number;
  commission_payable: number;
}

export interface FinanceSummary {
  period: { from: string; to: string };
  sales: FinanceSalesBlock;
  cash: FinanceCashBlock;
  balances: FinanceBalancesBlock;
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

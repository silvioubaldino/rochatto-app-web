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
  items?: QuoteItem[];
  created_at: string;
}

// Dashboard
export interface DashboardResumo {
  total_a_receber: number;
  total_a_pagar_fornecedor: number;
  total_comissoes_pendentes: number;
  lucro_periodo: number;
  total_vendido_periodo: number;
  vendas_abertas: number;
  periodo: { inicio: string; fim: string };
}

export interface Notificacao {
  id: string;
  tipo: "pagamento_vencido" | "pagamento_vencendo";
  venda_id: string;
  pagamento_id: string;
  cliente_nome: string;
  valor: number;
  data_ref: string;
  dias_restantes: number;
  lida: boolean;
}

export interface VendasPorMes {
  mes: string;
  total_venda: number;
  lucro: number;
}

export interface ProdutoMaisVendido {
  produto_id: string;
  produto_nome: string;
  quantidade_total: number;
  receita_total: number;
  preco_medio: number;
  custo_medio: number;
  margem_percentual: number | null;
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

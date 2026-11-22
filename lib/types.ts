export type ItemOrigin = "MADE_TO_ORDER" | "FROM_STOCK";
export type ItemKind = "PRODUCT" | "SERVICE";
export type PurchaseKind = "MADE_TO_ORDER" | "STOCK_REPLENISHMENT";
export type PurchaseStatus = "OPEN" | "ORDERED" | "RECEIVED";
export type SaleDeliveryStatus = "TO_DELIVER" | "DELIVERED" | "CANCELED";
export type SalePaymentStatus = "PENDING" | "PARTIAL" | "PAID";
export type PaymentMethod = "PIX" | "CASH" | "CARD" | "BOLETO" | "TRANSFER";
export type StockAdjustmentReason = "INITIAL" | "COUNT" | "OTHER";
export type SaleItemWarning = "INSUFFICIENT_STOCK";

export type PartnerType = "ARCHITECT" | "ENGINEER" | "BUILDER" | "OTHER";
export type LeadSource = "REFERRAL" | "INSTAGRAM" | "PARTNER" | "OTHER";

export interface Partner {
  id: string;
  name: string;
  phone: string | null;
  type: PartnerType;
  notes: string | null;
  created_at: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  created_at: string;
}

export interface Cliente {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  cidade?: string;
  observacoes?: string;
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
  default_supplier_id?: string | null;
  default_supplier_name?: string | null;
  created_at: string;
}

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
  origin: ItemOrigin | null;
  purchase_id: string | null;
  kind?: ItemKind;
  service_id?: string | null;
  stock_balance?: number | null;
}

export interface ItemVendaWriteResponse extends ItemVenda {
  warnings?: SaleItemWarning[] | null;
}

export interface Venda {
  id: string;
  number?: number;
  items_count?: number;
  first_item_name?: string | null;
  cliente_id: string;
  cliente_nome: string;
  vendedor_externo_id?: string;
  vendedor_externo_nome?: string;
  quote_id?: string;
  delivery_status: SaleDeliveryStatus;
  payment_status: SalePaymentStatus;
  data_venda: string;
  data_entrega_prevista?: string;
  observacoes?: string;
  total_venda: number;
  total_custo: number;
  total_recebido: number;
  a_receber: number;
  receivable: number;
  lucro: number;
  itens?: ItemVenda[];
  composition?: SaleComposition;
  costs_paid?: number;
  costs_open?: number;
  obligations?: Obligation[];
  created_at: string;
}

export type SaleChargeKind = "FREIGHT" | "OTHER";
export type SaleCostKind = "FREIGHT" | "LABOR" | "COMMISSION" | "OTHER";

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

export interface SaleCost {
  id: string;
  sale_id: string;
  kind: SaleCostKind;
  amount: number;
  description: string | null;
  payee: SalePayee | null;
  sale_item_id: string | null;
  obligation_id: string | null;
  warnings?: ObligationWarning[];
}

export interface SaleComposition {
  items_total: number;
  charges: SaleCharge[];
  charges_total: number;
  price_total: number;
  costs: SaleCost[];
  costs_total: number;
}

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
  kind?: ItemKind;
  service_id?: string | null;
  created_at: string;
}

export interface Quote {
  id: string;
  number?: number;
  sale_id?: string | null;
  sale_number?: number | null;
  items_count?: number;
  first_item_name?: string | null;
  customer_id: string;
  customer_name: string;
  referrer_id?: string;
  referrer_name?: string;
  status: QuoteStatus;
  lost_reason?: string;
  quote_date: string;
  notes?: string;
  total_quote: number;
  charges?: SaleCharge[];
  quick_sale: boolean;
  items?: QuoteItem[];
  created_at: string;
}

export interface DashboardKpis {
  period: { from: string; to: string };
  sales: {
    count: number;
    revenue: number;
    profit: number;
    average_ticket: number;
  };
  quotes: {
    created: number;
    won: number;
    lost: number;
    open: number;
    conversion_rate: number | null;
  };
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
  obligation_id?: string | null;
  installment_id?: string | null;
  cliente_nome: string;
  valor: number;
  data_ref: string;
  dias_restantes: number | null;
  lida: boolean;
}

export interface VendasPorMes {
  mes: string;
  total_venda: number;
  lucro: number;
  sales_count: number;
}

export interface ProdutoMaisVendido {
  produto_id: string | null;
  produto_nome: string;
  total_vendas: number;
  total_quantidade: number;
  total_receita: number;
  preco_medio: number;
  custo_medio: number;
  margem_media_percent: number;
  unit: string | null;
}

export interface ServicoMaisVendido {
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

export interface PurchaseSaleItem {
  id: string;
  sale_id: string;
  customer_name: string;
  produto_nome: string;
  quantidade: number;
  custo_unit: number;
}

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
  number?: number;
  kind: PurchaseKind;
  status: PurchaseStatus;
  supplier_id: string;
  supplier_name: string;
  expected_date: string | null;
  notes: string | null;
  ordered_at: string | null;
  received_at: string | null;
  total_cost: number;
  payable: number;
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

export interface PurchaseStatusResponse {
  id: string;
  status: PurchaseStatus;
  ordered_at: string | null;
  received_at: string | null;
}

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

export interface StockMovement {
  kind: StockMovementKind;
  date: string;
  quantity: number;
  unit_cost: number | null;
  reference_id: string | null;
  description: string | null;
}

export interface StockStatement extends StockBalance {
  movements: StockMovement[];
}

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

export interface FinanceSalesBlock {
  count: number;
  revenue: number;
  cost: number;
  profit: number;
  received: number;
  receivable: number;
}

export interface FinanceReceivedByMethod {
  payment_method: PaymentMethod | null;
  amount: number;
}

export interface FinanceCategoryAmount {
  category: MovementCategory;
  amount: number;
}

export interface FinanceCashBlock {
  inflow: number;
  outflow: number;
  net: number;
  by_category: FinanceCategoryAmount[];
  received_by_method: FinanceReceivedByMethod[];
}

export interface FinanceExpensesBlock {
  total: number;
  by_category: FinanceCategoryAmount[];
}

export interface FinanceResultBlock {
  sales_profit: number;
  expenses: number;
  net_result: number;
}

export interface FinancePayableByKind {
  kind: SupplierKind;
  open: number;
}

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

export type SupplierKind = "STONE" | "TRANSPORT" | "LABOR" | "TAX_AUTHORITY" | "OTHER";
export type ObligationDirection = "PAYABLE" | "RECEIVABLE";
export type ObligationStatus = "OPEN" | "PARTIAL" | "SETTLED";
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
export type ObligationComponentType =
  | "SALE_ITEMS"
  | "LEGACY_FREIGHT"
  | "LEGACY_COMMISSION"
  | "PURCHASE_ITEMS";
export type ObligationWarning = "MIXED_COUNTERPARTIES" | "OVERSETTLED";

export interface ObligationComponent {
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
  amount: number;
  category: MovementCategory;
  payment_method: PaymentMethod | null;
  counterparty_name: string | null;
  description: string | null;
  settlements: MovementSettlement[];
  unallocated: number;
  created_at: string;
  corrected_at: string | null;
}

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
  counterparty: { type: CounterpartyType; id: string; name: string } | null;
  amount: number;
  settled: number;
  open: number;
  status: ObligationStatus;
  due_date: string | null;
  overdue: boolean;
  next_installment: { due_date: string; amount_open: number } | null;
  notes: string | null;
  components?: ObligationComponent[];
  installments?: Installment[];
  settlements?: ObligationSettlement[];
  warnings?: ObligationWarning[];
}

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

export interface SettlementResponse {
  movement: FinancialMovement;
  obligations: Obligation[];
  warnings?: ObligationWarning[];
}

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

export type ConnectionScope = "read" | "write";

export interface AuthorizationRequest {
  id: string;
  client_name: string;
  redirect_host: string;
  scopes: ConnectionScope[];
  expires_at: string;
}

export interface AuthorizationDecision {
  redirect_to: string;
}

export interface Connection {
  id: string;
  client_name: string;
  scopes: ConnectionScope[];
  created_at: string;
  last_used_at: string | null;
}

export type PendingActionKind =
  | "RECEIVABLE_DUE"
  | "PAYABLE_DUE"
  | "DELIVERY_DUE"
  | "ITEMS_WITHOUT_SUPPLIER"
  | "ITEMS_TO_PURCHASE"
  | "PURCHASE_TO_ORDER"
  | "PURCHASE_TO_RECEIVE"
  | "RECEIVABLE_WITHOUT_PLAN"
  | "COST_WITHOUT_PAYEE"
  | "QUOTE_STALE"
  | "NEGATIVE_STOCK";

export type PendingEntityType = "SALE" | "QUOTE" | "PURCHASE" | "OBLIGATION" | "PRODUCT" | "SUPPLIER";

export interface PendingActionItem {
  entity: { type: PendingEntityType; id: string };
  number: number | null;
  title: string;
  date: string | null;
  overdue: boolean;
  amount: number | null;
  quantity: number | null;
}

export interface PendingActionGroup {
  kind: PendingActionKind;
  count: number;
  overdue_count: number;
  amount: number | null;
  items: PendingActionItem[];
}

export interface PendingActions {
  today: string;
  horizon_days: number;
  total_overdue: number;
  groups: PendingActionGroup[];
}

export type SearchType = "CUSTOMER" | "QUOTE" | "SALE" | "PURCHASE" | "PRODUCT" | "SERVICE" | "SUPPLIER" | "PARTNER";

export interface SearchItem {
  id: string;
  number: number | null;
  title: string;
  date: string | null;
  amount: number | null;
  status: string | null;
  city: string | null;
  kind: string | null;
}

export interface SearchGroup {
  type: SearchType;
  items: SearchItem[];
}

export interface SearchResponse {
  groups: SearchGroup[];
}

export interface ClosingItemInput {
  quote_item_id?: string;
  item_index?: number;
  origin?: ItemOrigin;
  supplier_id?: string | null;
  labor_payee_id?: string | null;
}

export interface ClosingCostInput {
  kind: SaleCostKind;
  amount: number;
  payee_id?: string | null;
  description?: string | null;
}

export interface ClosingRequest {
  delivery_due_date?: string | null;
  items?: ClosingItemInput[];
  costs?: ClosingCostInput[];
  receivable_plan?: { installments: InstallmentInput[] };
  down_payment?: { amount: number; occurred_on: string; payment_method: PaymentMethod };
}

export interface ClosingWarning {
  code: "INSUFFICIENT_STOCK";
  quote_item_id?: string;
  item_index?: number;
}

export interface ClosingResponse {
  sale_id: string;
  quote_id: string;
  sale_number?: number;
  warnings?: ClosingWarning[];
}

export interface BatchFulfillmentItem {
  id: string;
  origin: ItemOrigin;
  fornecedor_id: string | null;
}

export interface BatchFulfillmentResponse {
  itens: ItemVenda[];
  warnings?: { item_id: string; code: "INSUFFICIENT_STOCK" }[];
}

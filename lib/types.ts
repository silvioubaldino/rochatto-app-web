// Enums
export type StatusVenda =
  | "A_ENTREGAR"
  | "A_ENTREGAR_DATA"
  | "A_RETIRAR"
  | "ENTREGUE_PARCIAL"
  | "ENTREGUE";

export type StatusPagamento = "pendente" | "recebido";

// Entidades base
export interface Cliente {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  cidade?: string;
  observacoes?: string;
  created_at: string;
}

export interface Produto {
  id: string;
  nome: string;
  descricao?: string;
  preco_referencia?: number;
  custo_referencia?: number;
  unidade?: string;
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

export interface VendedorExterno {
  id: string;
  nome: string;
  telefone?: string;
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
  pago_fornecedor: number;
  a_pagar_fornecedor: number;
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
  vendedor_externo_id?: string;
  vendedor_externo_nome?: string;
  status: StatusVenda;
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
  a_pagar_fornecedor: number;
  a_pagar_frete: number;
  lucro: number;
  itens?: ItemVenda[];
  pagamentos?: PagamentoCliente[];
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

// Estoque
export interface EstoqueResumo {
  produto_id: string;
  produto_nome: string;
  quantidade_total: number;
  custo_medio: number;
  valor_total_estoque: number;
  ultima_entrada: string;
}

export interface EstoqueEntrada {
  id: string;
  produto_id?: string;
  produto_nome: string;
  fornecedor_id?: string;
  fornecedor_nome?: string;
  quantidade_entrada: number;
  custo_unit: number;
  data_entrada: string;
  observacoes?: string;
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

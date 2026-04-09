# Phase 05 — Dashboard: KPIs, Gráficos e Alertas

## Objetivo da fase

Implementar o dashboard principal com cards de KPIs, gráficos de vendas e produtos, alertas de pagamentos pendentes/vencidos e navegação contextual. Esta é a tela inicial do sistema após o login.

## Pré-requisitos

- Phase 04 concluída
- Backend Phase 05 funcionando (endpoints `/dashboard/resumo`, `/dashboard/notificacoes`, `/relatorios/vendas`, `/relatorios/produtos`)

## Entregáveis

- [ ] Cards de KPI com totais financeiros do período
- [ ] Seletor de período com atalhos (mês atual, mês anterior, ano)
- [ ] Gráfico de barras: Vendas e Lucro por mês
- [ ] Gráfico/tabela: Produtos mais vendidos
- [ ] Painel de alertas: pagamentos vencidos e vencendo
- [ ] Badge de notificações no sidebar
- [ ] Ação rápida para confirmar pagamento direto do alerta

---

## 1. Estrutura da página: `app/(app)/dashboard/page.tsx`

```
┌────────────────────────────────────────────────────────────────────┐
│ Dashboard                    Período: [Mês Atual ▾] [01/04–30/04] │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  [Card: A Receber]  [Card: A Pagar Forn.]  [Card: Lucro do Mês]   │
│  [Card: Vendas Abertas]  [Card: Comissões Pendentes]               │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│                        │                                           │
│  ALERTAS (2)           │  VENDAS POR MÊS (últimos 6 meses)        │
│  ⚠️ Marciel Ortis      │  [Gráfico de barras]                     │
│  R$3.348 venceu 3d     │                                           │
│  [Ver venda]           │                                           │
│                        │                                           │
│  🗓️ Alan Campione     │                                           │
│  R$2.080 em 4 dias     │                                           │
│  [Confirmar] [Ver]     │                                           │
│                        │                                           │
├────────────────────────┴───────────────────────────────────────────┤
│  PRODUTOS MAIS VENDIDOS                                            │
│  Produto         │ Qtd │ Receita │ Preço Médio │ Margem %         │
│  Rock Face Trav. │ 65  │ R$17k  │ R$ 260,00   │ 30,8%            │
└────────────────────────────────────────────────────────────────────┘
```

---

## 2. Hooks

```typescript
// hooks/useDashboard.ts
export function useDashboardResumo(dataInicio: string, dataFim: string)
export function useNotificacoes()
export function useVendasPorMes(meses: number)
export function useProdutosMaisVendidos(dataInicio?: string, dataFim?: string)
```

---

## 3. Seletor de Período

Componente `components/dashboard/PeriodoSelector.tsx`:

**Atalhos rápidos:**
- Mês Atual (padrão)
- Mês Anterior
- Últimos 3 Meses
- Ano Atual
- Personalizado → abre dois date pickers

**Comportamento:**
- Ao mudar o período → `dataInicio` e `dataFim` são recalculadas
- Os KPIs e a tabela de produtos atualizam automaticamente (SWR revalida)
- O gráfico de barras tem seu próprio seletor de "últimos N meses" (independente do período)

---

## 4. Cards de KPI

Criar `components/dashboard/KPICard.tsx`:

```typescript
interface KPICardProps {
  title: string;
  value: string;         // valor formatado ex: "R$ 12.170,00"
  subtitle?: string;     // ex: "Vendas abertas: 4"
  variant?: "default" | "success" | "warning" | "danger";
  icon?: React.ReactNode;
  isLoading?: boolean;
  onClick?: () => void;  // navegação contextual
}
```

### 5 Cards implementados

| Card | Valor | Subtítulo | Variante | Ação ao clicar |
|---|---|---|---|---|
| A Receber | `total_a_receber` | `vendas_abertas` vendas em aberto | warning | `/vendas?pendente=true` |
| A Pagar Fornecedores | `total_a_pagar_fornecedor` | — | danger | `/vendas` |
| Lucro do Período | `lucro_periodo` | `total_vendido_periodo` vendido | success | — |
| Vendas Abertas | `vendas_abertas` (número) | Não entregues | default | `/vendas?status=A_ENTREGAR` |
| Comissões Pendentes | `total_comissoes_pendentes` | A pagar parceiros | warning | `/vendas` |

**Loading state:** Skeleton com shimmer animation enquanto `isLoading = true`.

---

## 5. Gráfico de Vendas por Mês

Componente `components/dashboard/VendasChart.tsx` usando Recharts:

```typescript
interface VendasChartProps {
  dados: { mes: string; total_venda: number; lucro: number }[];
  isLoading?: boolean;
}
```

**Tipo:** `BarChart` com duas barras por mês:
- Barra 1 (azul): `total_venda`
- Barra 2 (verde): `lucro`

**Detalhes:**
- Eixo X: nome do mês em português abreviado (Jan, Fev, Mar…)
- Eixo Y: valores em R$ com `tickFormatter`
- Tooltip: exibir `total_venda` e `lucro` formatados
- Legenda: "Vendas" e "Lucro"
- `ResponsiveContainer` com `height={280}`
- Seletor no topo: "Últimos 6 meses" / "Últimos 12 meses"

**Estado de loading:** Skeleton retangular da mesma altura.
**Estado vazio:** Mensagem "Nenhuma venda no período".

```typescript
// Formatar mês no eixo X
function formatMes(isoDate: string): string {
  return format(parseISO(isoDate), "MMM/yy", { locale: ptBR });
}
```

---

## 6. Tabela de Produtos Mais Vendidos

Componente `components/dashboard/ProdutosTable.tsx`:

**Colunas:** Produto | Qtd Total | Receita Total | Preço Médio | Custo Médio | Margem %

**Regras visuais:**
- Margem > 30% → texto verde
- Margem 15-30% → texto amarelo
- Margem < 15% → texto vermelho

**Limite:** Top 10 produtos (sempre).

**Estado vazio:** "Nenhuma venda registrada no período."

---

## 7. Painel de Alertas

Componente `components/dashboard/AlertasPanel.tsx`:

```typescript
interface Notificacao {
  id: string;
  tipo: "pagamento_vencido" | "pagamento_vencendo";
  venda_id: string;
  cliente_nome: string;
  valor: number;
  data_ref: string;
  dias_restantes: number;
}
```

### Visual por tipo

**Vencido** (`dias_restantes < 0`):
```
┌─────────────────────────────────────────────────┐
│ ⚠️ Pagamento Vencido           X (marcar lido)  │
│ Alan Campione — R$ 2.080,00                     │
│ Venceu há 3 dias (06/04/2026)                   │
│ [Ver Venda]  [Confirmar Recebimento]            │
└─────────────────────────────────────────────────┘
```
Fundo: vermelho claro `bg-red-50`, borda esquerda vermelha.

**Vencendo** (0 <= `dias_restantes` <= 5):
```
┌─────────────────────────────────────────────────┐
│ 🗓️ Pagamento Agendado          X (marcar lido) │
│ Marciel Ortis — R$ 3.348,00                     │
│ Vence em 4 dias (13/04/2026)                    │
│ [Ver Venda]                                     │
└─────────────────────────────────────────────────┘
```
Fundo: amarelo claro `bg-yellow-50`, borda esquerda amarela.

### Botão "Confirmar Recebimento"

Ao clicar → abre mini-modal inline (sem sair do dashboard):
```
Confirmar recebimento de R$ 2.080,00 de Alan Campione?
Data: [hoje] (editável)
[Cancelar] [Confirmar]
```
POST para `/vendas/{id}/pagamentos/{pagId}/confirmar`.
Após confirmar: remover o alerta da lista e atualizar KPIs.

### Botão X (marcar como lido)
POST para `/dashboard/notificacoes/{id}/lida`.
Remove visualmente sem recarregar a página.

---

## 8. Badge de notificações no Sidebar

No link "Dashboard" do sidebar, exibir um badge vermelho com o count de notificações não lidas:

```
● Dashboard    [3]
```

Usar `useNotificacoes()` no layout `app/(app)/layout.tsx`.

Atualizar automaticamente a cada 5 minutos via SWR:
```typescript
useSWR('/dashboard/notificacoes', api.get, { refreshInterval: 5 * 60 * 1000 })
```

---

## Critérios de aceite

| # | Critério | Como verificar |
|---|---|---|
| 1 | KPIs carregam com valores corretos | Conferir com dados reais do banco |
| 2 | Mudar período atualiza KPIs e tabela de produtos | Selecionar "Mês Anterior" |
| 3 | Gráfico exibe barras de vendas e lucro por mês | Verificar presença de dados |
| 4 | Tooltip do gráfico mostra valores formatados em R$ | Hover sobre barra |
| 5 | Alerta vencido aparece com fundo vermelho | Criar pagamento com data passada |
| 6 | Alerta vencendo aparece com fundo amarelo | Criar pagamento com data em 3 dias |
| 7 | Confirmar recebimento via alerta funciona | Confirmar e ver alerta sumir |
| 8 | Badge no sidebar mostra count correto | Verificar número bate com alertas |
| 9 | Cards são clicáveis e navegam corretamente | Clicar "A Receber" → vai para /vendas?pendente=true |
| 10 | Skeleton aparece durante loading | Simular conexão lenta com DevTools throttle |

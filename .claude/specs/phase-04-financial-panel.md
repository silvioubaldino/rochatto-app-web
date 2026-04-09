# Phase 04 — Financial Panel: Pagamentos e Controle Financeiro

## Objetivo da fase

Implementar o painel financeiro completo dentro da tela de detalhe da venda: registro de pagamentos recebidos e agendados, confirmação de pagamentos pendentes, histórico de recebimentos e visualização de todos os saldos financeiros.

## Pré-requisitos

- Phase 03 concluída — tela de detalhe de venda funcionando
- Backend Phase 04 funcionando

## Entregáveis

- [ ] Aba/seção "Pagamentos" na tela de detalhe da venda
- [ ] Formulário de registro de novo pagamento (recebido ou agendado)
- [ ] Listagem de pagamentos com indicação de status
- [ ] Botão de confirmação para pagamentos agendados
- [ ] Edição e exclusão de pagamentos
- [ ] Totais financeiros completos e sempre atualizados
- [ ] Indicador visual de venda totalmente paga

---

## 1. Integração na tela de detalhe

A seção de pagamentos é adicionada à `app/(app)/vendas/[id]/page.tsx` como uma nova seção abaixo dos itens.

### Hook

```typescript
// hooks/usePagamentos.ts
export function usePagamentos(vendaId: string) {
  const { data, isLoading, mutate } = useSWR<PagamentoCliente[]>(
    vendaId ? `/vendas/${vendaId}/pagamentos` : null,
    api.get
  );
  return {
    pagamentos: data ?? [],
    isLoading,
    refresh: mutate,
  };
}
```

---

## 2. Seção de Pagamentos na tela de detalhe

### Layout da seção

```
┌────────────────────────────────────────────────────────────────┐
│ PAGAMENTOS DO CLIENTE                  [+ Registrar Receb.]    │
├───────────────┬─────────────┬────────────┬────────────────────┤
│ Valor         │ Data        │ Status     │ Ações              │
├───────────────┼─────────────┼────────────┼────────────────────┤
│ R$ 4.680,00   │ 09/04/2026  │ ✅ Recebido│ ✏️ 🗑️             │
│ R$ 2.080,00   │ 🗓️ 09/05/26 │ ⏳ Agend.  │ ✔ Confirmar ✏️ 🗑️│
├────────────────────────────────────────────────────────────────┤
│ Total Recebido: R$ 4.680,00    │    A Receber: R$ 2.080,00    │
│                                                                │
│  [████████████░░░░░░░░░░] 69% recebido                        │
└────────────────────────────────────────────────────────────────┘
```

### Visual de status de pagamento

| Status | Ícone | Cor | Texto |
|---|---|---|---|
| recebido | ✅ | Verde | "Recebido em {data}" |
| pendente (futuro) | 🗓️ | Amarelo | "Agendado para {data}" |
| pendente (vencido) | ⚠️ | Vermelho | "Vencido — {data}" |

Um pagamento pendente é **vencido** quando `data_agendada < hoje`.

### Barra de progresso
```
(total_recebido / total_venda) × 100 = % recebido
```
- 100%: fundo verde, texto "Totalmente pago ✅"
- < 100%: barra azul parcial

---

## 3. Modal de Registro de Pagamento: `components/forms/PagamentoModal.tsx`

### Props
```typescript
interface PagamentoModalProps {
  open: boolean;
  onClose: () => void;
  vendaId: string;
  pagamento?: PagamentoCliente; // edição
  totalVenda: number;
  totalRecebido: number;
  onSuccess: () => void;
}
```

### Campos do formulário

| Campo | Input | Obrigatório | Notas |
|---|---|---|---|
| Valor | MoneyInput | Sim | > 0 |
| Tipo | Radio: "Recebido" / "Agendar" | Sim | default: "Recebido" |
| Data do Recebimento | DatePicker | Se Recebido | default: hoje |
| Data Agendada | DatePicker | Se Agendar | — |
| Observações | Textarea | Não | forma de pagamento, nota |

### Comportamento do campo Tipo

**"Recebido"** selecionado:
- Mostrar campo "Data do Recebimento"
- Esconder "Data Agendada"

**"Agendar"** selecionado:
- Mostrar campo "Data Agendada"
- Esconder "Data do Recebimento"
- Mostrar hint: *"Você receberá um alerta 5 dias antes desta data."*

### Informação contextual no modal
Mostrar no topo do modal:
```
Saldo pendente: R$ 2.080,00
```
Sugerir automaticamente o valor do saldo pendente como valor padrão do campo.

### Submit
- POST para `/vendas/{vendaId}/pagamentos`
- Após sucesso: fechar modal, `onSuccess()` → SWR revalida pagamentos E a venda (para atualizar totais)

---

## 4. Confirmação de Pagamento Agendado

Botão "✔ Confirmar" na linha do pagamento pendente:

**Comportamento:**
- Abre mini-modal de confirmação:
  ```
  Confirmar recebimento de R$ 2.080,00?
  Data: [09/05/2026] (editável)
  [Cancelar] [Confirmar]
  ```
- POST para `/vendas/{vendaId}/pagamentos/{pagId}/confirmar`
- Após sucesso: atualizar lista de pagamentos e totais

---

## 5. Atualização dos totais na tela de detalhe

Após qualquer operação de pagamento (criar, confirmar, editar, deletar), revalidar:
1. `mutate('/vendas/{id}')` — atualiza totais na seção de resumo financeiro
2. `mutate('/vendas/{id}/pagamentos')` — atualiza lista de pagamentos

O painel de resumo financeiro deve exibir **todos** os campos:

```
┌────────────────────────────────┐
│ RESUMO FINANCEIRO              │
│                                │
│ Total Venda:      R$ 6.760,00  │
│ Total Custo:      R$ 4.680,00  │
│                                │
│ Recebido:         R$ 4.680,00  │
│ A Receber:        R$ 2.080,00  │
│                                │
│ A Pagar Fornec.:  R$ 4.680,00  │
│ Frete a Pagar:    R$   150,00  │
│ Comissão Devida:  R$   200,00  │
│                                │
│ Lucro Estimado:   R$ 1.730,00  │
│ Margem:               25,6%    │
└────────────────────────────────┘
```

---

## 6. Seção de Frete e Comissão (complemento da fase anterior)

Adicionar na tela de detalhe campos editáveis para:

### Frete
```
Frete Negociado: R$ [150,00]  Pago: R$ [  0,00]   A Pagar: R$ 150,00
                              [Atualizar frete pago]
```

### Comissão
```
Comissão: R$ 200,00 para [Carlos Parceiro]
Status: ⬜ Não paga   [Marcar como paga]
```

Ao clicar "Marcar como paga" → `PUT /vendas/{id}` com `{ comissao_paga: true }` → atualizar UI.

---

## Critérios de aceite

| # | Critério | Como verificar |
|---|---|---|
| 1 | Registrar pagamento "recebido" atualiza total_recebido e a_receber | Verificar painel de resumo após criar |
| 2 | Registrar pagamento "agendado" aparece com status amarelo | Criar com data futura |
| 3 | Pagamento vencido aparece com ícone vermelho | Criar com data passada |
| 4 | Barra de progresso reflete % correto | Conferir matematicamente |
| 5 | Barra fica verde e texto "Totalmente pago" quando 100% | Pagar valor total |
| 6 | Confirmar pagamento agendado muda status para recebido | Fluxo completo |
| 7 | Confirmar pagamento já recebido mostra erro | Tentar confirmar duas vezes |
| 8 | Deletar pagamento atualiza todos os totais | Verificar a_receber após delete |
| 9 | Comissão "marcar como paga" atualiza imediatamente | Clicar e ver checkbox mudar |
| 10 | Campo frete_pago atualiza "a pagar frete" em tempo real | Editar frete pago |

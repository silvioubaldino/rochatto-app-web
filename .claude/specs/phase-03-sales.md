# Phase 03 — Sales: Listagem, Criação e Detalhe de Vendas

## Objetivo da fase

Implementar o fluxo completo de vendas: listagem com filtros e cores de status, formulário de criação com múltiplos itens e múltiplos fornecedores, e tela de detalhe com edição. Esta é a fase mais complexa do frontend.

## Pré-requisitos

- Phase 02 concluída — clientes e catálogos funcionando
- Backend Phase 03 funcionando

## Entregáveis

- [ ] Listagem de vendas com filtros e cores por status
- [ ] Formulário de nova venda com adição dinâmica de itens
- [ ] Tela de detalhe da venda com edição de status e dados gerais
- [ ] Edição inline de itens (preço, custo, fornecedor)
- [ ] Adição e remoção de itens em venda existente
- [ ] Hook `useVendas` e `useVenda`

---

## 1. Estrutura de páginas

```
app/(app)/vendas/
  page.tsx              → listagem de vendas
  nova/
    page.tsx            → formulário de criação
  [id]/
    page.tsx            → detalhe + edição
```

---

## 2. Hooks SWR

```typescript
// hooks/useVendas.ts
export function useVendas(filters?: {
  status?: StatusVenda;
  data_inicio?: string;
  data_fim?: string;
  cliente_id?: string;
  pendente?: boolean;
})

// hooks/useVenda.ts
export function useVenda(id: string)
```

---

## 3. Tela de Listagem: `app/(app)/vendas/page.tsx`

### Layout

```
┌────────────────────────────────────────────────────────────────┐
│ Vendas                                       [+ Nova Venda]    │
├────────────────────────────────────────────────────────────────┤
│ Status [▾ Todos] │ De [____] Até [____] │ Cliente [busca...]   │
├───────────┬────────────────┬──────────┬──────────┬────────────┤
│ Data      │ Cliente        │ Total    │ A Receber│ Status     │
├───────────┼────────────────┼──────────┼──────────┼────────────┤
│ 09/04/26  │ Alan Campione  │ R$6.760  │ R$6.760  │ 🟡 A Entr.│
│ 08/04/26  │ Marciel Ortis  │ R$3.348  │ R$0      │ 🟢 Entregue│
└───────────┴────────────────┴──────────┴──────────┴────────────┘
```

### Comportamento
- Cada linha tem cor de fundo conforme o status (ver tabela no CLAUDE.md)
- Clicar na linha → navegar para `/vendas/{id}`
- Filtro de status: dropdown com opções + "Todos"
- Filtro de data: dois date pickers (início e fim)
- Filtro de cliente: campo de busca com autocomplete
- Filtros são aplicados via query string da URL (ex: `?status=A_ENTREGAR`)
- Botão "+ Nova Venda" → `/vendas/nova`
- Colunas exibidas: Data, Cliente, Produto(s) (resumo), Total Venda, A Receber, Lucro, Status

### Coluna "Produto(s)"
Se a venda tem 1 item: mostrar o nome do produto.
Se tem 2+: mostrar o nome do primeiro + "e mais N"

---

## 4. Formulário de Nova Venda: `app/(app)/vendas/nova/page.tsx`

### Estrutura visual

```
┌──────────────────────────────────────────────────────┐
│ Nova Venda                                           │
├──────────────────────────────────────────────────────┤
│ DADOS GERAIS                                         │
│ Cliente* [Selecionar cliente...]    Data* [09/04/26] │
│ Status*  [A Entregar ▾]     Data Entrega [opcional] │
│ Vendedor Externo [Opcional ▾]                        │
│                                                      │
├──────────────────────────────────────────────────────┤
│ ITENS DA VENDA                                       │
├────────────────┬───────┬────────┬────────┬──────────┤
│ Produto        │ Forn. │  QTD   │ Venda  │  Custo   │
├────────────────┼───────┼────────┼────────┼──────────┤
│ [Rock Face...] │[Bahia]│  [26]  │[260,00]│ [180,00] │ 🗑️
│ [Moledo Trav.] │[Est.] │  [3]   │[230,00]│     [-]  │ 🗑️
├────────────────┴───────┴────────┴────────┴──────────┤
│                              [+ Adicionar Produto]   │
├──────────────────────────────────────────────────────┤
│ LOGÍSTICA E COMISSÃO                                 │
│ Frete Valor [150,00]    Frete Pago [0,00]            │
│ Comissão  [Vendedor ▾] [200,00]                      │
│ Observações [texto livre...]                         │
├──────────────────────────────────────────────────────┤
│ RESUMO (calculado em tempo real)                     │
│ Total Venda: R$ 6.760,00   Total Custo: R$ 4.680,00  │
│ Lucro: R$ 1.730,00         Margem: 25,6%             │
├──────────────────────────────────────────────────────┤
│              [Cancelar]      [Salvar Venda]          │
└──────────────────────────────────────────────────────┘
```

### Campo "Cliente"
- Input com autocomplete: ao digitar, chama `GET /clientes/search?q=`
- Mostra lista de sugestões em dropdown
- Ao selecionar, armazena o `cliente_id`
- Botão "+" ao lado para criar novo cliente em modal (sem sair da página)

### Campo "Vendedor Externo"
- Select com lista de vendedores externos cadastrados
- Opção vazia "Nenhum" como padrão
- Se selecionar um vendedor → mostrar campo de valor de comissão

### Campo "Status"
- Select com os 5 valores do enum
- Se selecionar "A Entregar na Data X" → mostrar campo "Data de Entrega" obrigatório

### Seção de Itens
- Lista de itens dinâmica — começa com 1 item vazio
- Cada item tem:
  - **Produto**: autocomplete (busca em `/produtos/search?q=`) ou digitação livre
  - **Fornecedor**: autocomplete (busca em `/fornecedores`) ou digitação livre
  - **Quantidade**: número decimal
  - **Preço Venda Unitário**: MoneyInput
  - **Custo Unitário**: MoneyInput
  - Botão 🗑️ para remover (desabilitado se for o único item)
- Ao selecionar produto do catálogo → preencher automaticamente preço/custo com os valores de referência (mas deixar editável)
- Botão "+ Adicionar Produto" → adiciona novo item vazio

### Resumo em tempo real
Calcular e exibir conforme usuário preenche os campos:
```
total_venda = Σ (qtd × preco_venda_unit)
total_custo = Σ (qtd × custo_unit)
lucro = total_venda - total_custo - frete_valor - comissao_valor
margem = (lucro / total_venda) × 100
```

### Submit
- Validação completa antes de enviar
- POST para `/vendas` com todos os dados incluindo itens
- Loading no botão durante requisição
- Sucesso → redirecionar para `/vendas/{id}` (detalhe da venda criada)
- Erro → toast com mensagem do backend

---

## 5. Tela de Detalhe: `app/(app)/vendas/[id]/page.tsx`

### Layout

```
┌────────────────────────────────────────────────────────┐
│ ← Vendas   Venda #abc...   [Status: 🟡 A Entregar ▾]  │
├────────────────────────────────────────────────────────┤
│ INFORMAÇÕES GERAIS         │ RESUMO FINANCEIRO          │
│ Cliente: Alan Campione     │ Total Venda: R$ 6.760,00   │
│ Data: 09/04/2026           │ Total Custo: R$ 4.680,00   │
│ Entrega: —                 │ Recebido:   R$ 0,00         │
│ Vendedor: —                │ A Receber:  R$ 6.760,00    │
│ Observações: —             │ Lucro:      R$ 1.730,00    │
│             [✏️ Editar]    │ Margem:     25,6%           │
├────────────────────────────────────────────────────────┤
│ ITENS DA VENDA                          [+ Add Item]   │
├───────────────┬──────────┬────────┬────────┬──────────┤
│ Produto       │Fornecedor│Total V.│Total C.│A Pagar F.│
├───────────────┼──────────┼────────┼────────┼──────────┤
│ Rock Face     │ Bahia    │R$6.760 │R$4.680 │ R$4.680  │
├────────────────────────────────────────────────────────┤
│ FRETE E COMISSÃO                                       │
│ Frete: R$150,00 / Pago: R$0,00 / A Pagar: R$150,00    │
│ Comissão: R$200,00 / Pago: Não  [Marcar como pago]    │
└────────────────────────────────────────────────────────┘
```

### Alteração de Status
- Dropdown de status diretamente no header da página
- Ao mudar para "A Entregar na Data X" → modal solicitando a data
- Confirmação antes de marcar como "Entregue"
- Salva via `PUT /vendas/{id}` (apenas o campo status)

### Editar Dados Gerais
- Botão "Editar" → abre o mesmo formulário de criação pré-populado
- Ou: edição inline dos campos principais (escolher abordagem simples)

### Itens — Edição Inline
- Clicar no valor de um campo do item → virar input editável
- Botão "Salvar" aparece ao lado → chama `PUT /vendas/{id}/itens/{itemId}`
- Botão 🗑️ → deletar item (com confirmação se for o único)
- Botão "+ Add Item" → linha nova adicionada no final da tabela

### Seção Frete e Comissão
- "A Pagar Frete" = frete_valor - frete_pago
- Campo inline para atualizar `frete_pago`
- Comissão: mostrar valor + checkbox/botão "Marcar como pago"

---

## 6. Badge de Status

Criar `components/ui/StatusBadge.tsx`:

```typescript
interface StatusBadgeProps {
  status: StatusVenda;
  showDate?: string; // para A_ENTREGAR_DATA, exibe a data
}
```

Usar as cores definidas no CLAUDE.md. Visual: pill arredondado com fundo colorido.

---

## Critérios de aceite

| # | Critério | Como verificar |
|---|---|---|
| 1 | Listagem exibe vendas com cores corretas por status | Criar vendas com statuses diferentes |
| 2 | Filtro de status funciona corretamente | Filtrar por "A Entregar" |
| 3 | Autocomplete de cliente no formulário funciona | Digitar nome e ver sugestões |
| 4 | Adicionar múltiplos itens funciona | Adicionar 3 itens na mesma venda |
| 5 | Resumo financeiro atualiza em tempo real | Mudar quantidade e ver lucro recalculado |
| 6 | A Entregar na Data X exige data de entrega | Selecionar status e verificar campo obrigatório |
| 7 | Venda criada redireciona para detalhe | Salvar venda e verificar redirecionamento |
| 8 | Tela de detalhe exibe itens e totais corretos | Conferir matemática |
| 9 | Alterar status na tela de detalhe salva no backend | Mudar status e recarregar página |
| 10 | Deletar item com confirmação funciona | Remover item de venda com 2+ itens |

# Phase 06 — Estoque: Controle de Estoque Físico

## Objetivo da fase

Implementar a tela de controle de estoque físico com registro de entradas de mercadoria, visão consolidada do estoque atual por produto e histórico de movimentações.

## Pré-requisitos

- Phase 05 concluída
- Backend Phase 06 funcionando

## Entregáveis

- [ ] Tela de Estoque com duas abas: Resumo e Histórico
- [ ] Formulário de nova entrada de estoque
- [ ] Edição e exclusão de entradas
- [ ] Filtros por produto e período

---

## 1. Estrutura: `app/(app)/estoque/page.tsx`

### Layout com abas

```
┌────────────────────────────────────────────────────┐
│ Estoque                        [+ Nova Entrada]    │
├────────────────────────────────────────────────────┤
│  [Resumo Atual]   [Histórico de Entradas]          │
├────────────────────────────────────────────────────┤
│  Conteúdo da aba                                   │
└────────────────────────────────────────────────────┘
```

---

## 2. Aba Resumo

Consumir `GET /estoque/resumo`.

**Tabela de resumo:**

| Produto | Qtd Total | Custo Médio | Valor Total | Última Entrada |
|---|---|---|---|---|
| Borda São Tomé 23x47 | 150 m² | R$ 65,55 | R$ 9.832,50 | 09/04/2026 |
| Rock Face Travertino | 65 m² | R$ 180,00 | R$ 11.700,00 | 07/04/2026 |

**Rodapé da tabela:**
```
Valor total em estoque: R$ 21.532,50
```

**Estado vazio:** "Nenhum produto em estoque. Registre a primeira entrada."

---

## 3. Aba Histórico

Consumir `GET /estoque` com filtros opcionais.

### Filtros

```
Produto [busca/select...]    De [____]  Até [____]    [Aplicar]
```

**Tabela de histórico:**

| Data | Produto | Fornecedor | Qtd | Custo Unit. | Total | Ações |
|---|---|---|---|---|---|---|
| 09/04/26 | Borda São Tomé | Paulinho | 50 m² | R$ 65,55 | R$ 3.277,50 | ✏️ 🗑️ |

- Ordenado por data DESC
- Coluna "Total" = `quantidade_entrada × custo_unit` (calculado no frontend)

---

## 4. Hook

```typescript
// hooks/useEstoque.ts
export function useEstoque(filters?: {
  produto_id?: string;
  data_inicio?: string;
  data_fim?: string;
})

export function useResumoEstoque()
```

---

## 5. Modal de Entrada de Estoque: `components/forms/EstoqueModal.tsx`

### Campos

| Campo | Input | Obrigatório | Notas |
|---|---|---|---|
| Produto | Autocomplete + texto livre | Sim | Busca no catálogo, aceita texto livre |
| Fornecedor | Autocomplete + texto livre | Não | Busca no catálogo |
| Quantidade | Number | Sim | > 0, aceita decimal |
| Custo Unitário | MoneyInput | Sim | >= 0 |
| Data de Entrada | DatePicker | Sim | default: hoje |
| Observações | Textarea | Não | — |

### Preview do total
```
Total da entrada: R$ 3.277,50
```
Calcular em tempo real: `quantidade × custo_unit`.

### Comportamento
- Ao selecionar produto do catálogo → preencher nome (mas custo não é pré-preenchido — varia por lote)
- POST para `/estoque`
- Após sucesso: fechar modal, revalidar ambas as abas (resumo e histórico)

---

## 6. Confirmação de exclusão

Mesmo componente `DeleteConfirmDialog` das fases anteriores.

**Mensagem:** "Tem certeza que deseja excluir esta entrada de estoque?"

Nota: Delete físico — não há soft delete no estoque.

---

## Critérios de aceite

| # | Critério | Como verificar |
|---|---|---|
| 1 | Aba Resumo exibe produtos com totais corretos | Conferir soma de entradas |
| 2 | Nova entrada sem produto do catálogo funciona | Digitar nome livre |
| 3 | Filtro por produto na aba Histórico funciona | Selecionar produto e verificar filtro |
| 4 | Total da entrada calcula em tempo real no modal | Alterar quantidade e ver total mudar |
| 5 | Editar entrada atualiza resumo e histórico | Alterar quantidade e verificar soma |
| 6 | Excluir entrada remove do histórico e atualiza resumo | Deletar e conferir totais |
| 7 | Valor total no rodapé da tabela de resumo está correto | Somar manualmente e comparar |

---

## Notas para evolução futura

Esta tela serve de base para funcionalidades v2:
- **Saídas de estoque**: registrar quando uma venda consume do estoque
- **Estoque mínimo**: alertar quando produto ficar abaixo de um threshold
- **Validade de lotes**: para produtos com prazo de validade
- **Integração com venda**: ao criar item de venda, descontar automaticamente do estoque

Nenhuma dessas funcionalidades deve ser implementada agora — documentar como backlog.

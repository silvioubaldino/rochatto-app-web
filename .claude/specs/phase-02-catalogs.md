# Phase 02 — Catalogs: CRUD de Clientes e Catálogos

## Objetivo da fase

Implementar as telas de cadastro de Clientes, Produtos, Fornecedores e Vendedores Externos com listagem, criação, edição e exclusão. Estas telas são a base para o formulário de vendas da próxima fase.

## Pré-requisitos

- Phase 01 concluída — autenticação e layout funcionando
- Backend Phase 02 funcionando e acessível

## Entregáveis

- [ ] Tela de listagem de Clientes com busca
- [ ] Modal de criação/edição de Cliente
- [ ] Tela de detalhe do Cliente (histórico de compras — placeholder)
- [ ] Tela de Catálogos com abas: Produtos / Fornecedores / Vendedores Externos
- [ ] CRUD completo dentro de cada aba (modal ou inline)
- [ ] Hooks SWR para cada recurso
- [ ] Confirmação de exclusão

---

## 1. Estrutura de páginas

```
app/(app)/
  clientes/
    page.tsx              → listagem + botão novo cliente
    [id]/
      page.tsx            → detalhe do cliente (fase 3+)
  catalogos/
    page.tsx              → abas: Produtos | Fornecedores | Vendedores Externos
```

---

## 2. Hooks SWR: `hooks/`

Criar um hook por recurso com a mesma estrutura:

```typescript
// hooks/useClientes.ts
export function useClientes(search?: string) {
  const key = search ? `/clientes/search?q=${search}` : "/clientes";
  const { data, error, isLoading, mutate } = useSWR<Cliente[]>(key, api.get);
  return {
    clientes: data ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}

export function useCliente(id: string) {
  const { data, error, isLoading, mutate } = useSWR<Cliente>(
    id ? `/clientes/${id}` : null,
    api.get
  );
  return { cliente: data, isLoading, error, refresh: mutate };
}
```

Criar o mesmo padrão para:
- `hooks/useProdutos.ts`
- `hooks/useFornecedores.ts`
- `hooks/useVendedoresExternos.ts`

---

## 3. Componente de Tabela Reutilizável

Criar `components/tables/DataTable.tsx` — tabela genérica usada em todas as listagens:

**Props:**
```typescript
interface DataTableProps<T> {
  columns: {
    key: keyof T | string;
    header: string;
    render?: (row: T) => React.ReactNode;
    width?: string;
  }[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}
```

**Visual:**
- Header com fundo cinza claro
- Linhas alternadas (striped)
- Hover com destaque suave
- Loading: skeleton de 5 linhas
- Estado vazio: ícone + mensagem centralizada

---

## 4. Tela de Clientes: `app/(app)/clientes/page.tsx`

### Layout
```
┌──────────────────────────────────────────────────────┐
│ Clientes                          [+ Novo Cliente]   │
├──────────────────────────────────────────────────────┤
│ 🔍 [Buscar por nome...                          ]    │
├──────────────────────────────────────────────────────┤
│ Nome          │ Cidade    │ Telefone   │ Ações        │
├──────────────────────────────────────────────────────┤
│ Alan Campione │ Dourados  │ 11999...   │ ✏️  🗑️      │
│ Alexandra     │ Rio Bril. │ —          │ ✏️  🗑️      │
└──────────────────────────────────────────────────────┘
```

### Comportamento
- Campo de busca com debounce de 300ms → chama `GET /clientes/search?q=`
- Botão "+ Novo Cliente" → abre `ClienteModal` em modo criação
- Botão ✏️ → abre `ClienteModal` em modo edição com dados pré-preenchidos
- Botão 🗑️ → abre `DeleteConfirmDialog`
- Após qualquer operação bem-sucedida → `refresh()` via SWR mutate
- Clicar na linha → navegar para `/clientes/{id}` (detalhe)

---

## 5. Modal de Cliente: `components/forms/ClienteModal.tsx`

### Props
```typescript
interface ClienteModalProps {
  open: boolean;
  onClose: () => void;
  cliente?: Cliente;  // se presente: modo edição; se ausente: modo criação
  onSuccess: () => void;
}
```

### Campos do formulário

| Campo | Input | Obrigatório | Validação |
|---|---|---|---|
| Nome | Text | Sim | min 1 char, max 200 |
| Telefone | Text | Não | — |
| E-mail | Email | Não | formato e-mail válido |
| Endereço | Text | Não | — |
| Cidade | Text | Não | — |
| Observações | Textarea | Não | — |

### Comportamento
- Schema Zod com as validações acima
- `useForm` do React Hook Form
- Modo edição: campos pré-populados com dados do cliente
- Submit: POST ou PUT conforme o modo
- Loading no botão durante submit
- Erros inline sob cada campo
- Em sucesso: fechar modal + `onSuccess()`
- Em erro da API: mostrar toast de erro com a mensagem

---

## 6. Dialog de confirmação reutilizável

Criar `components/DeleteConfirmDialog.tsx`:

```typescript
interface DeleteConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;           // "Excluir cliente"
  description: string;     // "Tem certeza que deseja excluir Alan Campione?"
}
```

**Visual:** Modal pequeno, título vermelho, botão "Excluir" em vermelho, botão "Cancelar".

---

## 7. Tela de Catálogos: `app/(app)/catalogos/page.tsx`

### Layout com Abas

```
┌──────────────────────────────────────────────┐
│  [Produtos]  [Fornecedores]  [Vendedores]     │
├──────────────────────────────────────────────┤
│                                              │
│  Conteúdo da aba selecionada                 │
│                                              │
└──────────────────────────────────────────────┘
```

Usar o componente `Tabs` do shadcn/ui.

### Aba Produtos

**Listagem:** Nome | Unidade | Preço Referência | Custo Referência | Ações

**Modal de Produto — campos:**

| Campo | Input | Obrigatório | Validação |
|---|---|---|---|
| Nome | Text | Sim | min 1 char |
| Descrição | Textarea | Não | — |
| Preço de Referência | Number | Não | >= 0 |
| Custo de Referência | Number | Não | >= 0 |
| Unidade | Text | Não | ex: m², peça, kg |

> **Nota de UX:** Exibir texto abaixo dos campos de preço: *"Estes valores são apenas referência. O preço real é definido em cada venda."*

### Aba Fornecedores

**Listagem:** Nome | Cidade | Telefone | Ações

**Modal — campos:** Nome (obrigatório), Cidade, Telefone, Observações.

### Aba Vendedores Externos

**Listagem:** Nome | Telefone | Ações

**Modal — campos:** Nome (obrigatório), Telefone, Observações.

---

## 8. Campo de Input Monetário

Criar `components/ui/MoneyInput.tsx` — será reutilizado no formulário de vendas:

```typescript
interface MoneyInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  disabled?: boolean;
}
```

**Comportamento:**
- Exibe o valor formatado como `R$ 1.234,56`
- Ao focar: permite edição numérica livre
- Ao perder foco: reformata o valor
- Internamente trabalha com `number` (float)

---

## 9. Toast de feedback

Usar o sistema de toast do shadcn/ui (`useToast`). Criar wrapper:

```typescript
// hooks/useToast.ts — já vem do shadcn, apenas padronizar uso:
// toast({ title: "Sucesso", description: "Cliente salvo com sucesso.", variant: "default" })
// toast({ title: "Erro", description: err.message, variant: "destructive" })
```

---

## Critérios de aceite

| # | Critério | Como verificar |
|---|---|---|
| 1 | Listagem de clientes carrega e exibe dados do backend | Verificar que aparecem os clientes cadastrados |
| 2 | Busca com debounce filtra em tempo real | Digitar nome parcial e ver resultado |
| 3 | Modal de criação valida campo nome vazio | Tentar salvar sem nome |
| 4 | Modal de edição pré-popula os campos | Clicar em editar e verificar campos |
| 5 | Exclusão com confirmação remove da lista | Clicar excluir → confirmar → cliente some |
| 6 | Modal fecha e lista atualiza após criar cliente | Criar cliente e ver na lista sem recarregar página |
| 7 | Abas de catálogos funcionam independentemente | Alternar entre Produtos/Fornecedores/Vendedores |
| 8 | MoneyInput formata e aceita edição corretamente | Digitar 1234.56, perder foco, ver R$ 1.234,56 |
| 9 | Erros da API aparecem como toast destrutivo | Simular erro de backend (desligar backend) |
| 10 | Layout funciona em mobile (sidebar como hamburger) | Reduzir viewport para 375px |

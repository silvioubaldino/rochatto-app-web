# Phase 01 — Foundation: Setup, Firebase Auth e Layout Protegido

## Objetivo da fase

Criar o esqueleto completo do frontend com autenticação Google funcionando, layout responsivo para as páginas protegidas, redirecionamento correto entre login e app, e a camada de API configurada para comunicar com o backend.

## Entregáveis

- [ ] Projeto Next.js 14 inicializado com TypeScript e Tailwind
- [ ] shadcn/ui instalado e configurado
- [ ] Firebase Auth configurado com Google Login
- [ ] Tela de login (`/login`) funcional
- [ ] Layout protegido: redireciona para login se não autenticado
- [ ] Sidebar de navegação com links para todas as seções
- [ ] `lib/api.ts` — wrapper de fetch autenticado
- [ ] `lib/types.ts` — tipos base do domínio
- [ ] Página de dashboard vazia (placeholder)
- [ ] `.env.local.example` documentado

---

## 1. Inicialização do projeto

```bash
npx create-next-app@latest sales-frontend \
  --typescript \
  --tailwind \
  --app \
  --src-dir=false \
  --import-alias="@/*"

cd sales-frontend

# shadcn/ui
npx shadcn-ui@latest init
# Escolher: Default style, Slate color, CSS variables: yes

# Componentes shadcn necessários nesta fase
npx shadcn-ui@latest add button card avatar dropdown-menu separator toast

# Dependências
npm install firebase swr date-fns react-hook-form @hookform/resolvers zod recharts
```

---

## 2. Configuração Firebase: `lib/firebase.ts`

```typescript
import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey:      process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain:  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId:   process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
```

---

## 3. Hook de autenticação: `hooks/useAuth.ts`

```typescript
// Fornece o estado de autenticação para toda a aplicação
// Retorna: { user, loading, signIn, signOut }
// user: FirebaseUser | null
// loading: boolean — true enquanto o Firebase verifica o estado inicial
// signIn: () => Promise<void> — abre popup do Google
// signOut: () => Promise<void>
```

**Comportamento:**
- Usar `onAuthStateChanged` do Firebase
- `loading = true` até o primeiro callback do `onAuthStateChanged`
- `signIn` chama `signInWithPopup(auth, googleProvider)`
- `signOut` chama `signOut(auth)`

---

## 4. Tela de Login: `app/(auth)/login/page.tsx`

### Layout
- Tela centralizada (vertical e horizontal)
- Logo / título do sistema no topo
- Card branco com sombra suave contendo:
  - Título: "Gestão de Vendas"
  - Subtítulo: "Entre com sua conta Google para continuar"
  - Botão "Entrar com Google" — ícone do Google + texto
- Rodapé discreto com versão do sistema

### Comportamento
- Se usuário já está autenticado → redirecionar para `/dashboard`
- Ao clicar em "Entrar com Google" → chamar `signIn()`
- Durante loading (após clicar) → mostrar spinner no botão, desabilitar
- Em caso de erro → mostrar toast com mensagem de erro
- Após login bem-sucedido → redirecionar para `/dashboard`

### Não mostrar
- Nenhum formulário de e-mail/senha
- Nenhum link de "esqueci a senha" ou "criar conta"

---

## 5. Layout protegido: `app/(app)/layout.tsx`

### Comportamento de proteção
```
Se loading → mostrar tela de carregamento (spinner centralizado)
Se !user → redirecionar para /login
Se user → renderizar layout com sidebar + children
```

### Estrutura do layout
```
┌─────────────────────────────────────────┐
│  SIDEBAR (fixo, 240px)  │  CONTENT      │
│                          │               │
│  Logo + nome do sistema  │  {children}   │
│                          │               │
│  Nav links:              │               │
│  • Dashboard             │               │
│  • Vendas                │               │
│  • Clientes              │               │
│  • Estoque               │               │
│  • Catálogos ▾           │               │
│    - Produtos            │               │
│    - Fornecedores        │               │
│    - Vendedores          │               │
│                          │               │
│  ───────────             │               │
│  Avatar + nome usuário   │               │
│  [Sair]                  │               │
└─────────────────────────────────────────┘
```

### Comportamento do Sidebar
- Link ativo visualmente destacado (fundo azul / texto branco)
- "Catálogos" é um accordion — abre/fecha ao clicar
- Em mobile (< 768px): sidebar se torna um menu hamburger com overlay
- Avatar do Google carregado de `user.photoURL`
- Nome do usuário de `user.displayName`
- "Sair" chama `signOut()` e redireciona para `/login`

---

## 6. API Wrapper: `lib/api.ts`

```typescript
// Wrapper central para todas as chamadas à API backend
// Responsabilidades:
// 1. Obter o idToken do usuário Firebase (renovando automaticamente)
// 2. Adicionar header Authorization: Bearer <token>
// 3. Adicionar Content-Type: application/json
// 4. Lançar erro estruturado se response não for ok

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function getToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new APIError(401, "Não autenticado");
  return user.getIdToken(); // Firebase renova automaticamente se expirado
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Erro desconhecido" }));
    throw new APIError(res.status, body.error ?? "Erro na requisição");
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// Helpers
export const api = {
  get:    <T>(path: string) => apiFetch<T>(path),
  post:   <T>(path: string, body: unknown) => apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown) => apiFetch<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: (path: string) => apiFetch<void>(path, { method: "DELETE" }),
};
```

---

## 7. Tipos base: `lib/types.ts`

Definir os tipos TypeScript que espelham os contratos da API:

```typescript
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
```

---

## 8. Utilitários: `lib/formatters.ts`

```typescript
// Formatar moeda brasileira: R$ 1.234,56
export function formatMoeda(valor: number): string

// Formatar data: dd/MM/yyyy
export function formatData(isoDate: string): string

// Label e cor do status da venda
export const STATUS_LABELS: Record<StatusVenda, string>
export const STATUS_COLORS: Record<StatusVenda, string>  // classes Tailwind

// Ex: formatMoeda(1234.56) → "R$ 1.234,56"
// Ex: formatData("2026-04-09") → "09/04/2026"
// Ex: STATUS_LABELS["A_ENTREGAR"] → "A Entregar"
// Ex: STATUS_COLORS["ENTREGUE"] → "bg-green-100 text-green-800"
```

---

## 9. Placeholder do Dashboard: `app/(app)/dashboard/page.tsx`

Por enquanto, apenas uma página com:
- Título "Dashboard"
- Mensagem "Em construção — aguarde as próximas fases"
- Layout completo visível (sidebar funcionando)

---

## Critérios de aceite

| # | Critério | Como verificar |
|---|---|---|
| 1 | `npm run build` sem erros de TypeScript | `npm run build` |
| 2 | Acessar `/` redireciona para `/login` | Browser sem login |
| 3 | Tela de login renderiza com botão Google | Visualizar `/login` |
| 4 | Clicar "Entrar com Google" abre popup do Firebase | Testar com conta Google real |
| 5 | Após login, redireciona para `/dashboard` | Fluxo completo |
| 6 | Acessar `/dashboard` sem login redireciona para `/login` | Abrir em aba anônima |
| 7 | Sidebar com todos os links renderiza corretamente | Verificar visual |
| 8 | "Sair" desloga e redireciona para `/login` | Clicar em Sair |
| 9 | `api.get('/health')` no console retorna `{status: "ok"}` | Testar via DevTools console |
| 10 | Avatar do usuário Google aparece na sidebar | Verificar após login |

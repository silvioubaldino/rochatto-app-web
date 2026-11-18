---
id: SPEC-006
type: spec
title: Assistant connector — consentimento /conectar e tela Integrações (web)
status: approved
updated: 2026-11-18
parents: [AYD-006@context]
related: [ADR-002@context, ADR-001@context, GLO]
---

# Spec: Assistant connector (parte deste repo — web)

> O QUÊ e COMO este repo cumpre o AYD-006. `approved` = contrato local congelado.
> Esta é a **única** SPEC web do AYD-006.

## Objetivo

Papel do web no AYD-006 (RF-37, RNF-07): ser a superfície de **consentimento** e de gestão
das **Connections** do Assistant connector. O web não fala OAuth nem MCP; só consome a API
de consentimento (§ 2.3–2.4) e a de Connections (§ 2.7), autenticado pelo Firebase como todo
o app.

- `/conectar?request_id=…`: o dono (logado) vê quem está pedindo acesso (`client_name`,
  `redirect_host`, *scopes*) e **Permite** ou **Nega**.
- `/integracoes`: lista as Connections ativas e **desconecta** (revoga).
- Item "Integrações" no menu.

Este repo **consome** o contrato do AYD-006; não o redefine.

## Critérios de aceite

```gherkin
Cenário: consentimento com o dono já logado
  Dado o dono logado e /conectar?request_id=R
  Quando a página abre
  Então GET /oauth/authorization-requests/R mostra "Conectar <client_name> ao Rochatto?",
       o redirect_host e os scopes em pt-BR
  Quando clica Permitir
  Então POST /oauth/authorization-requests/R/approve e o navegador vai para redirect_to

Cenário: /conectar com o dono deslogado
  Dado um visitante sem sessão em /conectar?request_id=R
  Então é levado a /login?next=%2Fconectar%3Frequest_id%3DR (a página não fica atrás do
       layout (app), que descartaria a query)
  E após o login volta a /conectar?request_id=R com o mesmo request_id

Cenário: negar
  Quando clica Negar
  Então POST .../deny e o navegador vai para redirect_to (error=access_denied)

Cenário: pedido expirado ou já decidido
  Dado GET .../R com 404
  Então a tela mostra "Pedido de conexão expirado; refaça pelo Claude." sem botões de decisão
  E approve/deny com 404 ou 409 mostram a mensagem correspondente e liberam nova tentativa

Cenário: conta fora da allowlist
  Dado GET ou approve com 403
  Então a tela informa que a conta não está autorizada, oferece "Trocar de conta" e
       nenhuma Connection é criada (a API recusa)

Cenário: link sem request_id
  Então a tela mostra "Link de conexão inválido" e não chama a API

Cenário: duplo clique
  Então os botões ficam desabilitados durante a chamada e após o sucesso (uma decisão só)

Cenário: listar Connections
  Dado GET /oauth/connections
  Então /integracoes mostra client_name, scopes, "Conectado em" e "Último uso"
       (last_used_at null → "nunca usada"); lista vazia → "Nenhuma conexão ativa."

Cenário: desconectar
  Quando clica Desconectar e confirma
  Então DELETE /oauth/connections/{id}, a lista é revalidada e a linha some
  E 404 (já revogada) é tratado como sucesso informativo

Cenário: menu
  Então o menu lateral (desktop e celular) tem "Integrações" → /integracoes
```

## Contratos consumidos

(AYD-006, sem redefinição.)

- `GET /api/v1/oauth/authorization-requests/{id}` → `{id, client_name, redirect_host, scopes, expires_at}`; 404.
- `POST /api/v1/oauth/authorization-requests/{id}/approve | /deny` (corpo `{}`) → `{redirect_to}`; 404, 409; 403 fora da allowlist.
- `GET /api/v1/oauth/connections` → `[{id, client_name, scopes, created_at, last_used_at|null}]`.
- `DELETE /api/v1/oauth/connections/{id}` → 204; 404.
- Entrada: `{WEB_APP_URL}/conectar?request_id=<id>` (302 vindo de `/oauth/authorize`).

## Abordagem (como)

- **Rotas:** `app/conectar/page.tsx` **fora** de `(app)` (layout protegido redireciona para
  `/login` e perde a query). A própria página, sem sessão, faz `router.replace` para
  `/login?next=<URL codificada>`. `app/(app)/integracoes/page.tsx` fica no layout protegido.
- **Login com retorno:** `app/(auth)/login/page.tsx` lê `?next=` e, após autenticar, faz
  `router.replace(next)` (padrão `/dashboard`). `lib/navigation.ts#safeNextPath` só aceita
  caminho interno (começa com uma única `/`) — evita *open redirect*. `useSearchParams`
  em `<Suspense>`.
- **Dados:** `hooks/useConnections.ts` (`useConnections`, `useAuthorizationRequest`) via SWR
  e `lib/api.ts`; o pedido é lido uma vez (sem revalidar em foco, sem retry), pois some ao ser
  decidido. Mutations por `api.post/delete`.
- **Navegação final:** `window.location.assign(redirect_to)`; só se for `http(s)://`
  (defesa em profundidade; o valor vem da API).
- **Tipos** em `lib/types.ts` (`AuthorizationRequest`, `AuthorizationDecision`, `Connection`,
  `ConnectionScope`); rótulos pt-BR em `lib/formatters.ts` (`formatConnectionScope`,
  `formatDataHora`).
- **UI:** `DeleteConfirmDialog` ganha `confirmLabel` opcional (padrão "Excluir") para
  reutilizar na revogação.
- Nomenclatura: rotas de tela em PT como as demais (`/conectar`, `/integracoes`), imposto
  pelo AYD; termos de domínio (Connection, Assistant connector) em inglês no código.

## Passos de implementação

1. Tipos, formatadores e `lib/navigation.ts`.
2. Hooks `useConnections`/`useAuthorizationRequest`.
3. Login com `?next=` + `Suspense`.
4. Página `/conectar`.
5. Página `/integracoes` + item de menu; `confirmLabel` no `DeleteConfirmDialog`.
6. `npm run lint`, `npx tsc --noEmit`, `npm run build`; CLAUDE.md e changelog.

## Arquivos / módulos afetados

- `app/conectar/page.tsx` (novo), `app/(app)/integracoes/page.tsx` (novo)
- `app/(auth)/login/page.tsx`, `app/(app)/layout.tsx`
- `hooks/useConnections.ts` (novo), `lib/navigation.ts` (novo)
- `lib/types.ts`, `lib/formatters.ts`, `components/DeleteConfirmDialog.tsx`

## Testes (ver docs/conventions.md)

- O repo não tem runner de testes automatizados (só lint/tsc/build); os cenários acima são
  validados por **verificação manual** contra a API com `MCP_ENABLED=true` e pelo build.
- **Aceite:** percorrer cada cenário (deslogado → login → volta com `request_id`; permitir;
  negar; 404; 403 com outra conta; revogar e ver 401 no próximo uso do Claude).
- **Unit (se houver runner no futuro):** `safeNextPath` (`/x?y=1` ok; `//evil`, `https://…`,
  `/\evil`, vazio → fallback).

## Casos de borda & fora de escopo

- Borda: login hoje é e-mail/senha do Firebase (o AYD diz "login Google existente"); a SPEC
  reaproveita a tela de login existente, sem criar outro método. O pedido expira em 10 min:
  o texto mostra a validade. Aba aberta após revogação: 404 tratado como sucesso.
- Fora: chat no app web; criar Connection pelo web; edição de *scopes*; exclusão de
  qualquer outra coisa; telas para DCR/clientes OAuth.

## Checklist de entrega

- [x] `/conectar` fora do layout protegido, com login e retorno preservando a query
- [x] Permitir / Negar / expirado / 409 / 403 / sem `request_id`
- [x] `/integracoes` lista e desconecta; item de menu
- [x] Tipos, rótulos pt-BR, hooks SWR
- [x] lint, tsc e build verdes
- [x] CLAUDE.md e changelog atualizados

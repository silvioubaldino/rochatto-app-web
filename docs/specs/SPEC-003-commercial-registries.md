---
id: SPEC-003
type: spec
title: Cadastros comerciais — Parceiros, origem do Customer e categorias de Product (web)
status: done
updated: 2026-11-18
parents: [AYD-003@context]
related: [GLO, PDR-001@context]
---

# Spec: Cadastros comerciais (parte deste repo — web)

> O QUÊ e COMO este repo cumpre o AYD-003. `done` = implementado (este documento é o
> registro histórico da entrega).

## Objetivo

Papel deste repo no AYD-003 (RF-01, RF-02, RF-04 / PDR-001 itens 13–15):

- trocar o cadastro legado de **vendedores externos** pelo **Partner** (UI: "Parceiros"),
  com **tipo** (Arquiteto / Engenheiro / Construtora / Outro), busca e filtro por tipo;
- dar ao **Customer** a **origem** (lead source: Indicação / Instagram / Parceiro / Outro,
  ou não informada) e, quando Parceiro, **qual** Partner — no formulário, na lista (coluna
  + filtro) e no detalhe;
- permitir ao dono cadastrar **categorias de Product** (criar / renomear / excluir) e
  selecionar a categoria no Product, com coluna e filtro na lista de Products.

Este repo **consome** os contratos do AYD-003; não redefine enums, payloads nem regras.

## Critérios de aceite

```gherkin
Cenário: Cadastrar Partner com tipo
  Dado que o dono está em Catálogos › Parceiros
  Quando ele cria um Parceiro informando nome e tipo "Arquiteto"
  Então é enviado POST /partners {name, type:"ARCHITECT", phone|null, notes|null}
    e o Parceiro aparece na lista com o tipo "Arquiteto" (nunca o código do enum)

Cenário: Tipo do Partner é obrigatório
  Dado o formulário de novo Parceiro sem tipo selecionado
  Quando o dono tenta salvar
  Então o erro "Tipo é obrigatório" aparece sob o campo e nada é enviado

Cenário: Filtrar Partners por tipo e buscar por nome
  Quando o dono escolhe o tipo "Construtora" e digita parte do nome
  Então a lista é carregada de GET /partners?q=<texto>&type=BUILDER

Cenário: Customer indicado por um Partner
  Dado o formulário de Cliente
  Quando o dono escolhe a origem "Parceiro"
  Então aparece o campo obrigatório "Parceiro"
  E salvar sem escolher o Parceiro mostra erro inline e não envia
  E salvar com o Parceiro envia lead_source:"PARTNER" e referrer_id:<uuid>

Cenário: Trocar a origem limpa o Parceiro
  Dado um Cliente com origem "Parceiro" e um Parceiro selecionado
  Quando o dono troca a origem para "Instagram" (ou para "Não informada")
  Então o campo Parceiro some, referrer_id é limpo e o envio leva referrer_id:null
    (lead_source:null quando "Não informada")

Cenário: Lista de Clientes mostra e filtra pela origem
  Dado Clientes com origens diferentes
  Quando o dono filtra pela origem "Parceiro" e por um Parceiro específico
  Então a lista vem de GET /clientes?lead_source=PARTNER&referrer_id=<uuid>
    e a coluna "Origem" mostra "Parceiro · <nome do Parceiro>"

Cenário: Detalhe do Cliente mostra a origem
  Quando o dono abre /clientes/{id}
  Então vê os dados do Cliente com "Origem" e, se Parceiro, o nome do Parceiro, e pode editar

Cenário: Categoria duplicada
  Dado que existe a categoria "Granito"
  Quando o dono cria (ou renomeia outra para) "granito"
  Então a API responde 409 e a mensagem "Já existe uma categoria com esse nome." aparece
    sob o campo, com o modal ainda aberto

Cenário: Product com categoria e filtro por categoria
  Quando o dono escolhe uma categoria no formulário de Product e salva
  Então é enviado category_id:<uuid> (ou null para "Sem categoria")
  E a lista de Products mostra a coluna "Categoria" e filtra via GET /produtos?category_id=<uuid>

Cenário: Categoria excluída continua aparecendo
  Dado um Product cuja categoria foi excluída
  Então a lista mostra "<category_name> (inativa)" e o formulário do Product mantém a
    categoria selecionada como "(inativa)" (não é limpa silenciosamente ao salvar)

Cenário: Indicação no Orçamento e na Sale usa Partners
  Quando o dono abre "Novo Orçamento" ou "Nova Venda"
  Então o campo de indicação lista os Partners de GET /partners ("Nome — Tipo")
  E nenhuma tela chama /vendedores-externos
```

## Contratos consumidos

_Referência ao AYD-003@context — apenas consumo:_

- `GET /partners?q=&type=`, `POST /partners`, `GET|PUT|DELETE /partners/{id}`;
  `Partner = {id, name, phone|null, type, notes|null, created_at}`.
- `/clientes` (legado): `lead_source` (`REFERRAL|INSTAGRAM|PARTNER|OTHER|null`),
  `referrer_id` (uuid|null; obrigatório sse `PARTNER`), resposta `referrer_name`;
  `GET /clientes?lead_source=&referrer_id=`. Erros 400 da regra exibidos via toast.
- `GET|POST /product-categories`, `PUT|DELETE /product-categories/{id}`;
  `ProductCategory = {id, name, created_at}`; 409 nome duplicado.
- `/produtos` (legado): `category_id` (req/res), `category_name` (res);
  `GET /produtos?category_id=`.
- `/vendedores-externos` **não é mais usado** (removido da API neste release).
  `vendas.vendedor_externo_id` / `vendedor_externo_nome` continuam como campos legados da
  Sale, apontando para o mesmo registro do Partner (mesmos IDs).

## Abordagem (como)

- **Tipos** (`lib/types.ts`): `PartnerType`, `LeadSource`, `Partner`, `ProductCategory`;
  `Cliente` ganha `lead_source`/`referrer_id`/`referrer_name`; `Produto` ganha
  `category_id`/`category_name`. `VendedorExterno` removido.
- **Rótulos** (`lib/formatters.ts`): `PARTNER_TYPE_LABELS`, `LEAD_SOURCE_LABELS`, listas
  ordenadas `PARTNER_TYPES`/`LEAD_SOURCES` e `formatLeadSource()` ("Parceiro · Nome").
- **Schemas** (`lib/schemas.ts`, novo): `partnerSchema`, `clienteSchema` (com
  `superRefine` espelhando a regra da API: `referrer_id` sse `lead_source = PARTNER`),
  `productCategorySchema`, e os montadores de payload `toPartnerPayload` /
  `toClientePayload` / `emptyToNull` — campos opcionais vazios vão como **`null`**, nunca `""`.
- **Hooks SWR**: `usePartners({q,type})`/`usePartner`, `useProductCategories`;
  `useClientes(search, {lead_source, referrer_id})`; `useProdutos({category_id})`.
  `hooks/useVendedoresExternos.ts` removido.
- **Catálogos** (`app/(app)/catalogos/page.tsx`): abas Produtos · **Categorias** ·
  Fornecedores · **Parceiros**. Parceiros com busca (debounce 300ms) + filtro por tipo;
  Categorias com criar/renomear/excluir (`ProductCategoryModal`, 409 → erro inline no
  campo via `setError`). Ao alterar categorias, todas as chaves SWR `/produtos*` são
  revalidadas (o `category_name` muda). Produtos ganham coluna e filtro de categoria.
- **Categoria inativa:** o contrato não traz flag de "excluída"; a UI considera inativa a
  categoria do Product que não está em `GET /product-categories` e a exibe por
  `category_name` com o sufixo "(inativa)" (lista e select do formulário).
- **Cliente** (`ClienteModal`): selects controlados (`Controller`) de Origem e Parceiro;
  ao sair de "Parceiro", `referrer_id` é limpo. Partner excluído ainda vinculado aparece
  como "(inativo)" no select. Lista de Clientes: coluna "Origem" + filtros de origem e
  (quando Parceiro) de Parceiro. Detalhe `/clientes/[id]` deixa de ser placeholder: mostra
  os dados, a origem, botão Editar e atalho para os Orçamentos do Cliente.
- **Orçamento / Sale**: selects de indicação passam a listar Partners ("Nome — Tipo").
  No novo Orçamento, ao escolher um Customer com origem Parceiro e sem indicação
  preenchida, a indicação é sugerida com o mesmo Partner (editável). Na Nova Venda o campo
  legado `vendedor_externo_id` é enviado como `null` quando vazio; detalhe da Sale rotula
  "Parceiro".

## Arquivos / módulos afetados

- `lib/types.ts`, `lib/formatters.ts`, `lib/schemas.ts` (novo).
- `hooks/usePartners.ts` (novo), `hooks/useProductCategories.ts` (novo),
  `hooks/useClientes.ts`, `hooks/useProdutos.ts`; `hooks/useVendedoresExternos.ts` (removido).
- `components/forms/PartnerModal.tsx` (novo), `components/forms/ProductCategoryModal.tsx`
  (novo), `components/forms/ClienteModal.tsx`, `components/forms/ProdutoModal.tsx`;
  `components/forms/VendedorExternoModal.tsx` (removido).
- `app/(app)/catalogos/page.tsx`, `app/(app)/clientes/page.tsx`,
  `app/(app)/clientes/[id]/page.tsx`, `app/(app)/orcamentos/novo/page.tsx`,
  `app/(app)/vendas/nova/page.tsx`, `app/(app)/vendas/[id]/page.tsx`.
- Fase 0: `.github/workflows/ci.yml` (lint, `tsc --noEmit`, build com `NEXT_PUBLIC_*`
  placeholder) e correção do único erro de lint pré-existente (`app/(auth)/login/page.tsx`,
  `any` → `unknown`).

## Testes (ver docs/conventions.md)

- **Aceite:** um teste por cenário Gherkin acima (Partner com tipo; tipo obrigatório;
  filtros de Partner; Customer via Partner; troca de origem limpa referrer; lista/filtro
  de Clientes; detalhe; 409 de categoria; Product com categoria/filtro; categoria inativa;
  indicação em Orçamento/Sale sem `/vendedores-externos`).
- **Unit:** `clienteSchema` (sem origem ✓; PARTNER sem referrer ✗; PARTNER com referrer ✓;
  outra origem com referrer ✗; origem fora da lista ✗), `toClientePayload` (`""` → `null`,
  referrer descartado fora de PARTNER), `partnerSchema` (tipo vazio ✗) e
  `toPartnerPayload` (phone/notes vazios → `null`), `productCategorySchema` (nome em branco ✗).
- **Situação:** o repo continua **sem test runner** (sem Jest/Vitest/Playwright no
  `package.json`); configurar um é decisão de convenção que precede esta SPEC. Os casos
  unitários acima foram verificados manualmente (script Node avulso sobre `lib/schemas.ts`,
  fora do repo) e o restante via `tsc --noEmit`, `eslint` e `next build`.

## Casos de borda & questões ao contrato (sinalizadas, não adaptadas localmente)

- **Busca × filtros de Customer:** o AYD define `lead_source`/`referrer_id` só em
  `GET /clientes`; a busca por nome usa o legado `GET /clientes/search?q=`, que não tem
  esses filtros. Com busca + filtro ativos, a UI filtra o resultado da busca no cliente
  (máx. 20 da busca). Sugestão ao AYD: aceitar `q` em `GET /clientes`.
- **Categoria/Partner "inativo":** o AYD diz "exibe como inativa", mas a resposta não
  traz flag; a UI infere pela ausência na lista ativa. Supõe-se que `category_name` e
  `referrer_name` continuam preenchidos após o soft-delete.
- **Semântica de `q` em `/partners`:** não especificada; a UI assume busca por nome.
- **Excluir Partner/categoria em uso:** o AYD não diz se é bloqueado; a UI permite e
  avisa que os vínculos são mantidos. Erros da API são exibidos via toast.
- **Customers sem origem:** não há filtro para `lead_source = null` no contrato.
- **Fora:** ranking de Partners/lead source no dashboard, Commission por Partner (RF-25),
  unidade como lista fixa.

## Checklist de entrega

- [x] Parceiros substituem Vendedores Externos (catálogo, Orçamento, Nova Venda, detalhe da Sale)
- [x] CRUD de Parceiros com tipo, busca e filtro por tipo
- [x] Cliente: Origem + Parceiro obrigatório quando "Parceiro"; limpeza ao trocar; zod = regra da API
- [x] Lista de Clientes com coluna e filtro de origem (e de Parceiro); detalhe mostra a origem
- [x] Categorias: criar / renomear / excluir; 409 inline
- [x] Product: select de categoria; lista com coluna e filtro; categoria excluída exibida como inativa
- [x] Uuids opcionais vazios enviados como `null`
- [x] CI (`.github/workflows/ci.yml`): lint, typecheck e build sem segredos
- [ ] Testes automatizados — **não implementado**: sem test runner no repo (ver Testes)
- [x] `docs/changelog.md` atualizado (Unreleased)

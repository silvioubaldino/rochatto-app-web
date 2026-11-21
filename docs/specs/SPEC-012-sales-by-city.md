---
id: SPEC-012
type: spec
title: Vendas por cidade — cidade na lista, filtro e agrupamento recolhível (web)
status: done
updated: 2026-11-21
parents: [AYD-002@context]
related: [RF-01@context, RF-20@context, AYD-003@context, AYD-004@context, GLO]
---

# Spec: Vendas por cidade (parte deste repo — web)

> Mudança **só no front**: consome contratos existentes (`GET /vendas`, `GET /clientes`), sem
> contrato novo — por isso não há AYD próprio. `done` = implementado.

## Objetivo

Na lista de Sales (`/vendas`), o dono precisa enxergar e operar por **cidade** (a cidade da obra
fica no Customer — RF-01): ver a cidade de cada Sale, **filtrar** por cidade e **agrupar** por
cidade com grupos que expandem/recolhem — sem repetir informação.

## UX (decisões)

- **Cidade sem coluna nova:** aparece como **linha secundária** sob o nome do Customer (cinza,
  menor). Não alarga a tabela (já larga no celular) e lê-se "quem · onde" num relance.
  Some quando seria redundante: **agrupado** (já está no cabeçalho do grupo) ou com
  **filtro de cidade** ativo (todas iguais).
- **Filtro "Cidade":** select junto aos demais filtros, com as cidades presentes no resultado
  dos **outros** filtros e a contagem — `Curitiba (12)` — mais "Sem cidade". Mostra só o que
  tem Sale e já diz o volume antes de clicar. A cidade selecionada nunca some da lista (fica
  com `(0)` se os outros filtros a esvaziarem).
- **Agrupar por cidade:** botão alternável. Cada grupo tem um **cabeçalho-linha** clicável
  (chevron ▸/▾, nome, "N vendas") com as **somas alinhadas às colunas** Total, A receber e
  Lucro, e "N a entregar" na coluna Entrega — o resumo da cidade sem abrir o grupo, útil para
  montar rotas. Grupos em ordem alfabética, "Sem cidade" por último; dentro do grupo, a ordem
  da API. Começam **expandidos**; "Recolher tudo / Expandir tudo" aparece com 2+ grupos.
- **Somas do grupo** excluem Sales **canceladas** (RN-04), que continuam listadas e contadas.
- **URL:** `?cidade=<chave>` e `?agrupar=cidade`, como os demais filtros (link compartilhável,
  voltar preserva). O estado recolhido de cada grupo não vai para a URL.
- Filtro + agrupamento juntos funcionam (um grupo só).

## Critérios de aceite

```gherkin
Cenário: Cidade na linha
  Dado Sales de Customers com cidade
  Quando o dono abre /vendas sem agrupar e sem filtro de cidade
  Então sob o nome do Customer aparece a cidade
  E Customer sem cidade não mostra a linha secundária

Cenário: Cidade não se repete
  Quando o dono agrupa por cidade ou filtra uma cidade
  Então a linha secundária da cidade não aparece nas Sales

Cenário: Filtro por cidade
  Dado os filtros de entrega/pagamento/período/Customer aplicados
  Então o select "Cidade" lista as cidades dessas Sales com a contagem, e "Sem cidade" se houver
  Quando escolhe "Curitiba (3)"
  Então a lista mostra as 3 Sales e a URL ganha ?cidade=curitiba

Cenário: Grafias diferentes são a mesma cidade
  Dado Customers com "São Paulo", "sao paulo" e " São  Paulo"
  Então formam um único grupo/opção, rotulado com a grafia mais frequente

Cenário: Agrupar e recolher
  Quando o dono clica "Agrupar por cidade"
  Então as Sales aparecem sob cabeçalhos por cidade (alfabético, "Sem cidade" por último)
  E cada cabeçalho mostra "N vendas", Σ Total, Σ A receber, Σ Lucro e "N a entregar"
  E clicar no cabeçalho recolhe/expande as Sales daquela cidade
  E "Recolher tudo"/"Expandir tudo" alterna todos os grupos
  E a URL ganha ?agrupar=cidade

Cenário: Canceladas fora das somas
  Dado uma cidade com uma Sale cancelada de R$ 1.000
  Então ela aparece no grupo e na contagem, mas não soma em Total/A receber/Lucro
```

## Contratos consumidos

- `GET /vendas` (AYD-002/AYD-004) — inalterado; filtros da API seguem os mesmos.
- `GET /clientes` (AYD-003) — lista completa, sem paginação, com `cidade`.

Nenhum contrato novo ou alterado.

## Abordagem (como)

- **Join no cliente:** `useClientes()` (sem busca → `GET /clientes`, cache SWR) monta o índice
  `cliente_id → cidade`. Filtro e agrupamento são **client-side** sobre o resultado de
  `GET /vendas` (lista não paginada; volume de 1 dono).
- **Normalização** (`lib/sales-by-city.ts`, regras puras): chave = sem acento, minúscula,
  espaços colapsados; vazio → `__none__` ("Sem cidade"); rótulo = grafia mais frequente.
  Funções: `cityKey`, `buildCityIndex`, `cityOptions`, `groupByCity`.
- **Página** (`app/(app)/vendas/page.tsx`): estado `cidade`/`agrupar` lido e escrito na URL;
  enquanto `/clientes` carrega e há filtro/agrupamento de cidade, mostra o esqueleto (evita
  "Sem cidade" falso). Cabeçalho de grupo é um `<button aria-expanded>` dentro da linha.

## Arquivos / módulos afetados

`lib/sales-by-city.ts` (novo), `app/(app)/vendas/page.tsx`.

## Testes (ver docs/conventions.md)

Sem test runner no repo — **testes automatizados não adicionados**. Verificação:
`npx tsc --noEmit`, `eslint` nos arquivos alterados, `npm run build`, e execução das funções
de `lib/sales-by-city.ts` com dados de exemplo (grafias, sem cidade, cancelada, ordem).

## Casos de borda & fora de escopo

- Borda: Customer excluído (soft-delete) some de `GET /clientes` → suas Sales caem em
  "Sem cidade". Cidade com grafias distintas mas não só acento/caixa ("Sao Paulo - SP") vira
  outro grupo — corrigir no cadastro do Customer.
- **Limite / caminho de evolução:** se `GET /vendas` ganhar paginação ou a lista de Customers
  ficar grande, mover para a API — `cliente_cidade` na resposta e `?cidade=` no filtro — o que
  **é contrato** e exige atualizar o AYD no repo de contexto.
- Fora: cidade por Sale (endereço da obra diferente do Customer), lista de cidades
  padronizada/UF, agrupar por outros campos, seleção de várias cidades.

## Checklist de entrega

- [x] Cidade sob o Customer, oculta quando redundante
- [x] Filtro "Cidade" com contagem, persistido na URL
- [x] Agrupar por cidade com somas por grupo, recolher/expandir e tudo
- [x] Normalização de grafias e "Sem cidade"
- [ ] Testes automatizados — sem test runner no repo
- [x] `docs/changelog.md` e `CLAUDE.md` atualizados

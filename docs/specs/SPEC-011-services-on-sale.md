---
id: SPEC-011
type: spec
title: Serviços na Sale — catálogo de Services e Items de serviço (web)
status: done
updated: 2026-11-19
parents: [AYD-010@context]
related: [PDR-002@context, AYD-001@context, AYD-002@context, AYD-009@context, SPEC-010, GLO]
---

# Spec: Serviços na Sale (parte deste repo — web)

> O QUÊ e COMO este repo cumpre o AYD-010 (RF-41). `done` = implementado.

## Objetivo

O dono vende **Services** (instalação, consultoria) no mesmo Quote/Sale que as pedras, ou sozinhos.
O Item de serviço não tem origem, Supplier nem Purchase; seu custo vive no custo da venda `LABOR`.

## Abordagem

- **Tipos** (`lib/types.ts`): `ItemKind`, `Service`, `ServicoMaisVendido`; `QuoteItem`/`ItemVenda` += `kind`,
  `service_id`; `ItemVenda.origin` passa a `ItemOrigin | null`.
- **Catálogos → Serviços** (`app/(app)/catalogos`): aba com busca (`GET /services?q`), `ServiceModal`
  (nome, unidade livre, preço e custo de referência, observações), exclusão; erro 409 (nome duplicado) em toast.
  Hook `useServices`, schema `serviceSchema`/`toServicePayload`.
- **Orçamento** (`/orcamentos/novo` e venda rápida): botão "Adicionar Serviço"; linha de serviço usa
  `ServicePicker` (catálogo ou texto livre), preço e **custo estimado** editáveis; payload `kind`,
  `service_id` (null em texto livre), `product_id: null`. Detalhe do orçamento: "Add Serviço" e selo "Serviço";
  o PUT de Item reenvia `kind`/`service_id` (mudar o tipo é 409).
- **Venda** (`SaleItemsCard`): "Adicionar serviço"; Item de serviço mostra "Serviço" na origem e "—" em
  Supplier/custo/compra (custo no card de custos da venda); edição só de quantidade e preço; payload
  com `custo_unit: 0`, sem origem/Supplier (`lib/sales.ts`).
- **Entrega**: Sale só de serviço (todos os Items `SERVICE`) lê **A executar / Executado**
  (`isServiceOnlySale`, `saleDeliveryLabel`) no badge e nas ações do detalhe; a lista de vendas
  não traz Items e mantém os rótulos padrão.
- **Fila de compra**: servida pela API (`/purchases/pending-sale-items` já exclui serviços); sem filtro no cliente.
- **Dashboard**: bloco "Serviços" (`ServicosTable`, `useServicosMaisVendidos`, `GET /relatorios/servicos?from&to`),
  separado do ranking de Products.

## Passos / testes

- [x] Tipos, rótulos, schemas, hook.
- [x] Aba Serviços em Catálogos.
- [x] Orçamento (novo, venda rápida e detalhe) com Items de serviço.
- [x] Detalhe da venda: Items de serviço e rótulos A executar / Executado.
- [x] Bloco Serviços no dashboard.
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build`.

## Ambiguidades (a confirmar no AYD-010)

1. `GET /services` não tem o formato de lista dito: assumido array simples, como os demais cadastros.
2. A conversão cria o custo `LABOR` só ao converter Quote → Sale; um Item de serviço adicionado direto na
   Sale não cria custo — o web orienta a lançar o custo/credor nos custos da venda.
3. `GET /vendas` (lista) não devolve Items: os rótulos "A executar / Executado" valem só no detalhe.
4. Vínculo `sale_item_id` do custo ao Item de serviço: sem UI nova (preservado no PUT, SPEC-010).

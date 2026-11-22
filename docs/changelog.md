---
id: CHANGELOG
type: changelog
title: This service's changelog
status: approved
updated: 2025-01-01
---

# Changelog — <serviço>

All notable changes to this service (specs, implementation, local decisions) are
documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Policy**:
- **Order:** most recent on top; new entries go **above** the previous ones.
- **Unreleased:** unreleased work accrues under `## Unreleased` (always the top block), with
  no date/version. On the releases, `## Unreleased` becomes `## [dd-MM-yyyy - vX.Y.Z]`
  (SemVer) and a new empty `## Unreleased` is opened above it.
- **One line per PR:** each PR adds a **single line** describing summarized what it delivers — general,
  no implementation or docs-framework detail; reference the PR (e.g. `[PR#02](url)`). The
  line **may omit SPEC additions** (tracked by their own files/git): if a PR only adds a
  SPEC, summarize the feature they open.

## Unreleased

- Implement SPEC-013 (U0–U1): Owner-journey UX foundation (AYD-011) — new `AppShell` (bottom bar on phone, shell before auth), pattern library (`DataTable`, `EntityCombobox` with "＋ Criar" quick-create, `EntitySheet` preview, `FilterBar`, `ResponsiveDialog`, `ConfirmDialog`…), semantic tokens and 44 px touch sizing, event-based SWR invalidation, test tooling (Vitest, Testing Library, MSW, Playwright, Lighthouse CI) and lint rules; fixes "Virou a Venda" link, Items column, history-aware back, "Fechar venda", customer filter name, tabs in URL and unsaved-changes guard.
- Implement SPEC-012: Sales and quotes by city — customer city under the customer name, city filter with counts, and collapsible group-by-city view with per-city summaries on Vendas and Orçamentos (front-end only).
- Implement SPEC-011: Services on sale (AYD-010) — Services catalog, service Items in quote/quick sale/sale (no origin or supplier), "A executar / Executado" labels for service-only sales, and a Services block on the dashboard.
- Implement SPEC-010: Sale composition (AYD-009) — quote form/detail with charged freight (Sale charges), sale detail with "Preço ao cliente" (items + charges), "Custos da venda" with editable payee and linked account, expected profit; removes Sale freight/commission fields and Financeiro freight/commission rows.
- Implement SPEC-009: Purchase composition (AYD-008) — purchase detail with goods + additional costs (Purchase charges, editable payee, "a definir"), allocation method selector, per-line landed cost, OVERSETTLED warning; purchase list filters `open_only`/`overdue`; allocation method on replenishment creation; stock value column and total on `/estoque`.
- Implement SPEC-008: Obligations and movements (AYD-007) — `/contas` (payable/receivable tabs, URL filters, bulk "Pagar várias contas" with MIXED_COUNTERPARTIES warning) and `/contas/[id]` (components, installments edit/generate, settlements, Pagar/Receber, due date/notes), `/movimentacoes` (create expense/OTHER_INCOME, correct, void), Supplier `kind` (register + filter), Financeiro with expenses, result and balances by creditor kind, alerts linking to the account. Replaces Sale Receipts and the Purchase single payment UI with the obligations; drops `frete_pago`/`comissao_paga`, Sale freight/commission-pending filters and Purchase payment filters.
- Implement SPEC-006: Assistant connector — consent page `/conectar` (login with return to the same URL, approve/deny), `/integracoes` to list and revoke Connections, and menu item.
- Implement SPEC-005: Dashboard — period KPIs (revenue, profit, average ticket, Quote → Sale conversion) and open balances with drill-down from `/dashboard/kpis`, same period presets as Financeiro, fixed monthly chart and Products ranking (real fields, units), "Venda rápida" badge on Quotes.
- Implement SPEC-004: Finance — payment method on Receipts (required when received, asked on confirm), Sale receivable and freight payable with freight validation, Sales list filters (freight/commission pending, period), and the new Financeiro screen (period sales, cash movement, open balances with drill-down).
- Implement SPEC-002: Sale fulfillment — item origin (made-to-order / from stock) and supplier per item, delivery/payment status and Sale cancellation; Purchases (list, "to buy" queue by supplier, stock replenishment, status and supplier payment); Stock balance, statement and adjustments replace the old stock entries; "New Sale" removed (Sales come from Quotes).
- Implement SPEC-003: Partners (with type) replace external sellers; Customer lead source with partner; product categories (manage, select, filter); CI workflow (lint, typecheck, build).
- Quote screens hardening: quote without supplier, quick sale, valid empty ids, item edits keep the product link.
- Implement SPEC-001: Orçamentos screens (list/filter, issue form with editable item price, mark as lost, convert to Sale with redirect); Sale detail now shows its originating Quote.
- Added SPEC-001: Quote screens (list/filter, issue form with editable item price, mark as lost, convert to Sale). [PR#2](https://github.com/silvioubaldino/rochatto-app-web/pull/2)
- Repo initialized from the scaffold.

import type { Page, Route } from "@playwright/test";

export interface MockApi {
  writes: { method: string; path: string; body: unknown }[];
  last(method: string, path: string | RegExp): { body: unknown } | undefined;
}

const TODAY = new Date().toISOString().slice(0, 10);
const addDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const ts = "2026-01-01T00:00:00Z";

const customers = [{ id: "c1", nome: "Alejandra Souza", cidade: "Bonito/MS", telefone: "(67) 99999-0000", lead_source: "REFERRAL", created_at: ts }];
const partners = [{ id: "pt1", name: "Arq. Paula", type: "ARCHITECT", phone: null, notes: null, created_at: ts }];
const suppliers = [
  { id: "f1", nome: "Matheus RJ", kind: "STONE", created_at: ts },
  { id: "f2", nome: "Nivaldo", kind: "LABOR", created_at: ts },
  { id: "f3", nome: "Motorista Y", kind: "TRANSPORT", created_at: ts },
];
const products = [
  { id: "p1", nome: "Rock face", unidade: "m²", preco_referencia: 269, custo_referencia: 165, default_supplier_id: "f1", created_at: ts },
  { id: "p2", nome: "Moledo", unidade: "m²", preco_referencia: 100, custo_referencia: 60, created_at: ts },
];
const services = [{ id: "sv1", name: "Instalação", unit: "m²", reference_price: 50, reference_cost: 30, notes: null, created_at: ts }];

const quoteItems = [
  { id: "qi1", quote_id: "q154", product_id: "p1", product_name: "Rock face", quantity: 18, unit_price: 269, unit_cost: 165, total_price: 4842, kind: "PRODUCT", created_at: ts },
  { id: "qi2", quote_id: "q154", product_id: "p2", product_name: "Moledo", quantity: 10, unit_price: 100, unit_cost: 60, total_price: 1000, kind: "PRODUCT", created_at: ts },
  { id: "qi3", quote_id: "q154", service_id: "sv1", product_name: "Instalação", quantity: 18, unit_price: 50, unit_cost: 30, total_price: 900, kind: "SERVICE", created_at: ts },
];
const quote = {
  id: "q154", number: 154, customer_id: "c1", customer_name: "Alejandra Souza", status: "OPEN", quote_date: TODAY,
  total_quote: 6742, quick_sale: false, items: quoteItems, charges: [], created_at: ts,
};
const saleItem = (over: object) => ({
  id: "si1", venda_id: "s1", produto_id: "p1", produto_nome: "Rock face", fornecedor_id: "f1", fornecedor_nome: "Matheus RJ",
  quantidade: 18, preco_venda_unit: 269, custo_unit: 165, total_venda: 4842, total_custo: 2970, origin: "MADE_TO_ORDER", purchase_id: null, kind: "PRODUCT", ...over,
});
const sale = {
  id: "s1", number: 98, cliente_id: "c1", cliente_nome: "Alejandra Souza", delivery_status: "TO_DELIVER", payment_status: "PENDING",
  data_venda: TODAY, total_venda: 6742, total_custo: 4110, total_recebido: 0, a_receber: 6742, receivable: 6742, lucro: 2632, quote_id: "q154",
  itens: [saleItem({}), saleItem({ id: "si2", produto_id: "p2", produto_nome: "Moledo", fornecedor_id: undefined, fornecedor_nome: undefined, origin: "FROM_STOCK", stock_balance: 4 })],
  composition: { items_total: 6742, charges: [], charges_total: 0, price_total: 6742, costs: [], costs_total: 0 }, created_at: ts,
};

const obligation = (open: number) => ({
  id: "o1", direction: "RECEIVABLE", origin: { type: "SALE", id: "s1", label: "Venda nº 98 · Alejandra Souza" },
  counterparty: { type: "CUSTOMER", id: "c1", name: "Alejandra Souza" }, amount: 3200, settled: 3200 - open, open,
  status: open > 0 ? "OPEN" : "SETTLED", due_date: addDays(-1), overdue: open > 0, next_installment: { due_date: addDays(-1), amount_open: open }, notes: null,
});

const purchaseRow = { id: "pu1", number: 12, kind: "MADE_TO_ORDER", status: "ORDERED", supplier_id: "f1", supplier_name: "Matheus RJ", expected_date: addDays(-1), notes: null, ordered_at: ts, received_at: null, total_cost: 2970, payable: 2970, paid: 0, created_at: ts };
const purchaseDetail = {
  ...purchaseRow, open: 2970, allocation_method: "BY_QUANTITY", items: [],
  sale_items: [{ id: "si1", sale_id: "s1", customer_name: "Alejandra Souza", produto_nome: "Rock face", quantidade: 18, custo_unit: 165 }],
  composition: { goods_total: 2970, charges: [{ id: "ch1", purchase_id: "pu1", kind: "FREIGHT", amount: 120, description: null, payee_supplier_id: "f3", payee_name: "Motorista Y", obligation_id: null }], charges_total: 120, total: 3090 },
  lines: [{ line_type: "SALE_ITEM", line_id: "si1", product_id: "p1", product_name: "Rock face", unit: "m²", quantity: 18, unit_cost: 165, base_cost: 2970, allocated_charges: 120, landed_total: 3090, landed_unit_cost: 171.67 }],
  obligations: [],
};

const supplierPayable = (id: string, open: number) => ({
  id, direction: "PAYABLE", origin: { type: "PURCHASE", id: "pu1", label: "Compra nº 12" },
  counterparty: { type: "SUPPLIER", id: "f1", name: "Matheus RJ" }, amount: open, settled: 0, open,
  status: "OPEN", due_date: addDays(3), overdue: false, next_installment: { due_date: addDays(3), amount_open: open }, notes: null,
});

export async function mockApi(page: Page): Promise<MockApi> {
  const writes: MockApi["writes"] = [];
  let received = false;
  let supplierPaid = false;
  const json = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

  await page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace(/^.*\/api\/v1/, "");
    const method = req.method();
    const body = method === "GET" ? undefined : req.postDataJSON();
    if (method !== "GET") writes.push({ method, path, body });

    if (method === "GET") {
      if (path === "/pending-actions") {
        const groups = [
          ...(received ? [] : [{ kind: "RECEIVABLE_DUE", count: 1, overdue_count: 1, amount: 3200, items: [{ entity: { type: "OBLIGATION", id: "o1" }, number: null, title: "Alejandra Souza", date: addDays(-1), overdue: true, amount: 3200, quantity: null }] }]),
          { kind: "DELIVERY_DUE", count: 2, overdue_count: 1, amount: null, items: [
            { entity: { type: "SALE", id: "s1" }, number: 98, title: "Alejandra Souza", date: addDays(-2), overdue: true, amount: null, quantity: null },
            { entity: { type: "SALE", id: "s2" }, number: 99, title: "Bruno Lima", date: TODAY, overdue: false, amount: null, quantity: null },
          ] },
        ];
        return json(route, { today: TODAY, horizon_days: 7, total_overdue: received ? 1 : 2, groups });
      }
      if (path === "/search") {
        const q = (url.searchParams.get("q") ?? "").toLowerCase();
        return json(route, { groups: "alejandra".includes(q) || q === "154" ? [{ type: "CUSTOMER", items: [{ id: "c1", number: null, title: "Alejandra Souza", date: null, amount: null, status: null, city: "Bonito/MS", kind: null }] }] : [] });
      }
      if (path === "/clientes" || path === "/clientes/search") return json(route, customers);
      if (path === "/clientes/c1") return json(route, customers[0]);
      if (path === "/clientes/c-new") return json(route, { id: "c-new", nome: "Fulano de Tal", created_at: ts });
      if (path === "/partners") return json(route, partners);
      if (path === "/partners/pt1") return json(route, partners[0]);
      if (path === "/fornecedores") return json(route, suppliers);
      if (path.startsWith("/fornecedores/")) return json(route, suppliers.find((f) => f.id === path.split("/")[2]) ?? suppliers[0]);
      if (path === "/produtos") return json(route, products);
      if (path.startsWith("/produtos/")) return json(route, products.find((p) => p.id === path.split("/")[2]) ?? { id: path.split("/")[2], nome: "Ônix azul", created_at: ts });
      if (path === "/services") return json(route, services);
      if (path === "/quotes/q154") return json(route, quote);
      if (path === "/quotes") return json(route, url.searchParams.get("customer_id") ? [quote] : []);
      if (path === "/vendas/s1") return json(route, sale);
      if (path === "/vendas") return json(route, [sale]);
      if (path === "/stock/balance") return json(route, [{ product_id: "p2", balance: 4 }, { product_id: "p1", balance: 25 }]);
      if (path === "/obligations/o1") return json(route, obligation(received ? 0 : 3200));
      if (path === "/obligations") {
        const dir = url.searchParams.get("direction");
        const origin = url.searchParams.get("origin_type");
        const supplier = url.searchParams.get("counterparty_type") === "SUPPLIER";
        const items = supplier
          ? supplierPaid ? [] : [supplierPayable("o2", 1200), supplierPayable("o3", 300.5)]
          : dir === "RECEIVABLE" || origin === "SALE" ? [obligation(received ? 0 : 3200)] : [];
        return json(route, { items, totals: { amount: 0, settled: 0, open: 0 }, total: items.length, offset: 0, has_more: false });
      }
      if (path === "/dashboard/kpis") return json(route, { period: { from: TODAY, to: TODAY }, sales: { count: 3, revenue: 48200, profit: 14900, average_ticket: 16066 }, quotes: { created: 7, won: 3, lost: 1, open: 3, conversion_rate: 0.42 }, balances: { receivable: 0, payable: 0, payable_by_counterparty_kind: [] }, open_deliveries: 1 });
      if (path === "/financial-movements") return json(route, { items: [], totals: { inflow: 0, outflow: 0, net: 0 }, total: 0, offset: 0, has_more: false });
      if (path === "/purchases/pending-sale-items") return json(route, []);
      if (path === "/purchases/pu1") return json(route, purchaseDetail);
      if (path === "/purchases") return json(route, [purchaseRow]);
      return json(route, []);
    }

    if (method === "POST" && path === "/clientes") return json(route, { id: "c-new", nome: (body as { nome: string }).nome, created_at: ts }, 201);
    if (method === "POST" && path === "/produtos") return json(route, { id: "p-new", nome: (body as { nome: string }).nome, unidade: "m²", preco_referencia: 80, custo_referencia: 40, created_at: ts }, 201);
    if (method === "POST" && path === "/quotes") return json(route, { ...quote, id: "q-new" }, 201);
    if (method === "POST" && path === "/quotes/q154/convert") return json(route, { sale_id: "s1", quote_id: "q154", sale_number: 98 }, 201);
    if (method === "POST" && path === "/settlements") {
      const first = (body as { allocations: { obligation_id: string }[] }).allocations[0]?.obligation_id;
      if (first === "o1") received = true;
      else supplierPaid = true;
      return json(route, { movement: { id: first === "o1" ? "m1" : "m2" }, obligations: [] }, 201);
    }
    if (method === "POST" && path === "/financial-movements") return json(route, { id: "m3" }, 201);
    if (method === "POST" && path === "/purchases") return json(route, { id: "pu1", number: 12 }, 201);
    return json(route, {});
  });

  return {
    writes,
    last: (method, path) =>
      [...writes].reverse().find((w) => w.method === method && (typeof path === "string" ? w.path === path : path.test(w.path))),
  };
}

import { http, HttpResponse } from "msw";

// Base da api nos testes (vitest.config.ts → NEXT_PUBLIC_API_URL).
export const API = "http://api.test/api/v1";

export const customers = [
  { id: "c1", nome: "Alejandra Souza", cidade: "Bonito/MS", created_at: "2026-01-01T00:00:00Z" },
  { id: "c2", nome: "Alberto Lima", cidade: "Campo Grande/MS", created_at: "2026-01-01T00:00:00Z" },
];

export const pendingActions = {
  today: "2026-11-22",
  horizon_days: 7,
  total_overdue: 2,
  groups: [
    {
      kind: "RECEIVABLE_DUE",
      count: 2,
      overdue_count: 1,
      amount: 3200,
      items: [
        {
          entity: { type: "OBLIGATION", id: "o1" },
          number: null,
          title: "Alejandra Souza",
          date: "2026-11-21",
          overdue: true,
          amount: 1200,
          quantity: null,
        },
      ],
    },
    {
      kind: "DELIVERY_DUE",
      count: 1,
      overdue_count: 0,
      amount: null,
      items: [
        {
          entity: { type: "SALE", id: "s1" },
          number: 98,
          title: "Alejandra Souza",
          date: "2026-11-22",
          overdue: false,
          amount: null,
          quantity: null,
        },
      ],
    },
  ],
};

export const searchResult = {
  groups: [
    {
      type: "QUOTE",
      items: [
        { id: "q154", number: 154, title: "Alejandra Souza", date: "2026-11-20", amount: 5842, status: "OPEN", city: "Bonito/MS", kind: null },
      ],
    },
    {
      type: "SALE",
      items: [{ id: "s154", number: 154, title: "Alejandra Souza", date: "2026-11-21", amount: 5842, status: "TO_DELIVER", city: null, kind: null }],
    },
  ],
};

export const products = [
  { id: "p1", nome: "Rock face", unidade: "m²", preco_referencia: 269, custo_referencia: 165, default_supplier_id: "f1", created_at: "2026-01-01T00:00:00Z" },
  { id: "p2", nome: "Moledo", unidade: "m²", preco_referencia: 100, custo_referencia: 60, created_at: "2026-01-01T00:00:00Z" },
];
export const suppliers = [
  { id: "f1", nome: "Matheus RJ", kind: "STONE", created_at: "2026-01-01T00:00:00Z" },
  { id: "f2", nome: "Nivaldo", kind: "LABOR", created_at: "2026-01-01T00:00:00Z" },
];
export const services = [
  { id: "sv1", name: "Instalação", unit: "m²", reference_price: 50, reference_cost: 30, notes: null, created_at: "2026-01-01T00:00:00Z" },
];

export const queueGroups = [
  {
    supplier_id: "f1",
    supplier_name: "Matheus RJ",
    items: [
      { id: "si1", sale_id: "s1", customer_name: "Alejandra Souza", produto_id: "p1", produto_nome: "Rock face", quantidade: 18, custo_unit: 165, sale_date: "2026-11-20" },
      { id: "si2", sale_id: "s2", customer_name: "Bruno Lima", produto_id: "p1", produto_nome: "Rock face", quantidade: 10, custo_unit: 165, sale_date: "2026-11-21" },
    ],
  },
  { supplier_id: null, supplier_name: null, items: [{ id: "si3", sale_id: "s3", customer_name: "Carla", produto_id: "p2", produto_nome: "Moledo", quantidade: 5, custo_unit: 60, sale_date: "2026-11-19" }] },
];

export const purchaseRows = [
  { id: "pu1", number: 12, kind: "MADE_TO_ORDER", status: "OPEN", supplier_id: "f1", supplier_name: "Matheus RJ", expected_date: null, notes: null, ordered_at: null, received_at: null, total_cost: 2970, payable: 2970, paid: 0, created_at: "2026-11-20T10:00:00Z" },
];

/** Handlers padrão. Cada teste sobrescreve o que precisar com `server.use(...)`. */
export const handlers = [
  http.get(`${API}/produtos`, () => HttpResponse.json(products)),
  http.get(`${API}/fornecedores`, () => HttpResponse.json(suppliers)),
  http.get(`${API}/fornecedores/:id`, ({ params }) => {
    const found = suppliers.find((f) => f.id === params.id);
    return found ? HttpResponse.json(found) : HttpResponse.json({ error: "não encontrado" }, { status: 404 });
  }),
  http.get(`${API}/services`, () => HttpResponse.json(services)),
  http.get(`${API}/stock/balance`, () => HttpResponse.json([{ product_id: "p2", balance: 4 }, { product_id: "p1", balance: 25 }])),
  http.get(`${API}/purchases/pending-sale-items`, () => HttpResponse.json(queueGroups)),
  http.get(`${API}/purchases`, () => HttpResponse.json(purchaseRows)),
  http.get(`${API}/pending-actions`, () => HttpResponse.json(pendingActions)),
  http.get(`${API}/search`, () => HttpResponse.json(searchResult)),
  http.get(`${API}/dashboard/kpis`, () =>
    HttpResponse.json({
      period: { from: "2026-11-01", to: "2026-11-22" },
      sales: { count: 3, revenue: 48200, profit: 14900, average_ticket: 16066 },
      quotes: { created: 7, won: 3, lost: 1, open: 3, conversion_rate: 0.42 },
      balances: { receivable: 0, payable: 0, payable_by_counterparty_kind: [] },
      open_deliveries: 1,
    }),
  ),
  http.get(`${API}/clientes/search`, ({ request }) => {
    const q = (new URL(request.url).searchParams.get("q") ?? "").toLowerCase();
    return HttpResponse.json(customers.filter((c) => c.nome.toLowerCase().includes(q)));
  }),
  http.get(`${API}/clientes`, () => HttpResponse.json(customers)),
  http.get(`${API}/clientes/:id`, ({ params }) => {
    const found = customers.find((c) => c.id === params.id);
    return found ? HttpResponse.json(found) : HttpResponse.json({ error: "não encontrado" }, { status: 404 });
  }),
  http.post(`${API}/clientes`, async ({ request }) => {
    const body = (await request.json()) as { nome: string };
    return HttpResponse.json(
      { id: "c-new", nome: body.nome, created_at: "2026-11-22T00:00:00Z" },
      { status: 201 },
    );
  }),
];

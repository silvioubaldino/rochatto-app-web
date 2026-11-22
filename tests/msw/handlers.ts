import { http, HttpResponse } from "msw";

// Base da api nos testes (vitest.config.ts → NEXT_PUBLIC_API_URL).
export const API = "http://api.test/api/v1";

export const customers = [
  { id: "c1", nome: "Alejandra Souza", cidade: "Bonito/MS", created_at: "2026-01-01T00:00:00Z" },
  { id: "c2", nome: "Alberto Lima", cidade: "Campo Grande/MS", created_at: "2026-01-01T00:00:00Z" },
];

/** Handlers padrão. Cada teste sobrescreve o que precisar com `server.use(...)`. */
export const handlers = [
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

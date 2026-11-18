/**
 * Destino pós-login (`/login?next=...`). Só aceita caminho interno do app
 * (começa com uma única "/"); qualquer outra coisa cai em `fallback` — evita open redirect.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}

/** `/login?next=<caminho atual com query>` — volta à mesma URL depois do login. */
export function loginUrlWithNext(pathAndQuery: string): string {
  return `/login?next=${encodeURIComponent(pathAndQuery)}`;
}

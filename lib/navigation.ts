/**
 * Destino pós-login (`/login?next=...`). Só aceita caminho interno do app
 * (começa com uma única "/"); qualquer outra coisa cai em `fallback` — evita open redirect.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/hoje"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}

export function loginUrlWithNext(pathAndQuery: string): string {
  return `/login?next=${encodeURIComponent(pathAndQuery)}`;
}

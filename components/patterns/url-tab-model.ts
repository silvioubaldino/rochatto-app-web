export function parseTab<T extends string>(value: string | null | undefined, allowed: readonly T[], fallback: T): T {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

export function tabQuery<T extends string>(current: URLSearchParams | string, param: string, tab: T, fallback: T): string {
  const params = new URLSearchParams(typeof current === "string" ? current : current.toString());
  if (tab === fallback) params.delete(param);
  else params.set(param, tab);
  return params.toString();
}

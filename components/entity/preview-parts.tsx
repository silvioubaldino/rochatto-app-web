import type { ReactNode } from "react";

/** Blocos de apresentação para o corpo das prévias (EntitySheet). */

export function PreviewFields({ rows }: { rows: ReadonlyArray<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
      {rows.map((r) => (
        <div key={r.label} className="contents">
          <dt className="text-muted-foreground">{r.label}</dt>
          <dd className="min-w-0 text-right break-words">{r.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function PreviewSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
      {children}
    </section>
  );
}

/** Lista curta (até `max`) com "e mais N". */
export function PreviewList<T>({
  items,
  max = 5,
  render,
  empty = "Nada por aqui.",
}: {
  items: readonly T[];
  max?: number;
  render: (item: T) => ReactNode;
  empty?: string;
}) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  const shown = items.slice(0, max);
  return (
    <ul className="space-y-1.5 text-sm">
      {shown.map((item, i) => (
        <li key={i} className="flex items-baseline justify-between gap-3">
          {render(item)}
        </li>
      ))}
      {items.length > max && <li className="text-muted-foreground">e mais {items.length - max}</li>}
    </ul>
  );
}

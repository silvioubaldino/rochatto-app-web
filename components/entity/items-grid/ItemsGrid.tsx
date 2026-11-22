"use client";

import { useState, type ReactNode } from "react";
import { Lock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsPhone } from "@/lib/media";
import { formatPercent, TONE_TEXT_CLASSES } from "@/lib/format";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { MoneyField, QuantityField } from "@/components/patterns/fields";
import { MoneyText, QuantityText } from "@/components/patterns/values";
import { useCatalogUnits } from "../entity-queries";
import { ItemPicker } from "./ItemPicker";
import {
  gridTotals,
  isLineLocked,
  lineCost,
  lineError,
  lineMargin,
  lineTotal,
  pickToLine,
  type ItemLine,
} from "./items-grid-model";

export interface ItemsGridProps {
  mode: "quote" | "sale";
  lines: ItemLine[];
  onChange: (lines: ItemLine[]) => void;
  readOnly?: boolean;
  selection?: ReadonlySet<string>;
  onSelectionChange?: (selection: Set<string>) => void;
  renderAttendance?: (line: ItemLine) => ReactNode;
  lockReason?: (line: ItemLine) => string | null;
  showErrors?: boolean;
  className?: string;
}

const defaultLockReason = (l: ItemLine) =>
  isLineLocked(l) ? "Item já está numa compra: só o preço pode mudar." : null;

export function ItemsGrid({
  mode,
  lines,
  onChange,
  readOnly,
  selection,
  onSelectionChange,
  renderAttendance,
  lockReason = defaultLockReason,
  showErrors,
  className,
}: ItemsGridProps) {
  const phone = useIsPhone();
  const units = useCatalogUnits(!readOnly || lines.length > 0);
  const [costOpen, setCostOpen] = useState(false);
  const showCost = mode === "quote" || costOpen;
  const totals = gridTotals(lines);

  const patch = (key: string, part: Partial<ItemLine>) =>
    onChange(lines.map((l) => (l.key === key ? { ...l, ...part } : l)));
  const remove = (key: string) => onChange(lines.filter((l) => l.key !== key));
  const unitOf = (l: ItemLine) => l.unit ?? units.get(l.productId ?? l.serviceId ?? "") ?? null;
  const toggle = (key: string) => {
    const next = new Set(selection);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectionChange?.(next);
  };
  const selectable = !!onSelectionChange && !readOnly;

  const common = { patch, remove, unitOf, readOnly, showErrors, lockReason, showCost, renderAttendance, toggle };

  return (
    <div className={cn("space-y-3", className)}>
      {mode === "sale" && lines.length > 0 && (
        <div className="flex justify-end">
          <Button type="button" variant="ghost" size="sm" aria-pressed={costOpen} onClick={() => setCostOpen((o) => !o)}>
            {costOpen ? "Ocultar custo e margem" : "Mostrar custo e margem"}
          </Button>
        </div>
      )}

      {lines.length > 0 &&
        (phone ? (
          <ul className="space-y-2" aria-label="Items">
            {lines.map((l) => (
              <LineCard key={l.key} line={l} mode={mode} selected={selection?.has(l.key)} selectable={selectable} {...common} />
            ))}
          </ul>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <caption className="sr-only">Items</caption>
              <thead>
                <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                  {selectable && <th scope="col" className="w-10 px-3 py-2" aria-label="Selecionar" />}
                  <th scope="col" className="px-3 py-2 font-medium">Item</th>
                  <th scope="col" className="w-32 px-3 py-2 font-medium">Qtd</th>
                  <th scope="col" className="w-36 px-3 py-2 font-medium">Preço unit.</th>
                  {showCost && <th scope="col" className="w-36 px-3 py-2 font-medium">{mode === "quote" ? "Custo est." : "Custo unit."}</th>}
                  <th scope="col" className="px-3 py-2 text-right font-medium">Total</th>
                  {showCost && <th scope="col" className="px-3 py-2 text-right font-medium">Margem</th>}
                  {renderAttendance && <th scope="col" className="px-3 py-2 font-medium">Atendimento</th>}
                  {!readOnly && <th scope="col" className="w-12 px-1 py-2"><span className="sr-only">Remover</span></th>}
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <LineRow key={l.key} line={l} mode={mode} selected={selection?.has(l.key)} selectable={selectable} {...common} />
                ))}
              </tbody>
            </table>
          </div>
        ))}

      {!readOnly && <ItemPicker onPick={(pick) => onChange([...lines, pickToLine(pick)])} />}

      {lines.length > 0 && (
        <p className="flex flex-wrap justify-end gap-x-4 gap-y-1 text-sm">
          <span>
            Items <strong><MoneyText value={totals.revenue} /></strong>
          </span>
          {showCost && (
            <>
              <span className="text-muted-foreground">
                Custo {mode === "quote" ? "estimado " : ""}<MoneyText value={totals.cost} />
              </span>
              <span className="text-muted-foreground">Margem {formatPercent(totals.margin)}</span>
            </>
          )}
        </p>
      )}
    </div>
  );
}

interface RowProps {
  line: ItemLine;
  mode: "quote" | "sale";
  readOnly?: boolean;
  showErrors?: boolean;
  showCost: boolean;
  selected?: boolean;
  selectable: boolean;
  patch: (key: string, part: Partial<ItemLine>) => void;
  remove: (key: string) => void;
  toggle: (key: string) => void;
  unitOf: (l: ItemLine) => string | null;
  lockReason: (l: ItemLine) => string | null;
  renderAttendance?: (l: ItemLine) => ReactNode;
}

function Marginal({ line }: { line: ItemLine }) {
  const m = lineMargin(line);
  return <span className={cn("tabular-nums", m !== null && m < 0 && TONE_TEXT_CLASSES.danger)}>{formatPercent(m)}</span>;
}

function NameCell({ line, error, lock }: { line: ItemLine; error: string | null; lock: string | null }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="flex flex-wrap items-center gap-1.5 font-medium">
        <span className="break-words">{line.name || "—"}</span>
        {line.kind === "SERVICE" && <StatusBadge kind="itemKind" value="SERVICE" />}
      </p>
      {lock && (
        <p className="flex items-start gap-1 text-xs text-muted-foreground">
          <Lock className="mt-0.5 size-3 shrink-0" aria-hidden />
          {lock}
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function LineRow({ line: l, mode, readOnly, showErrors, showCost, selected, selectable, patch, remove, toggle, unitOf, lockReason, renderAttendance }: RowProps) {
  const lock = lockReason(l);
  const locked = !!lock;
  const unit = unitOf(l);
  const error = showErrors ? lineError(l) : null;
  return (
    <tr className="border-b align-top last:border-b-0">
      {selectable && (
        <td className="px-3 py-2">
          <input type="checkbox" className="size-4" checked={!!selected} onChange={() => toggle(l.key)} aria-label={`Selecionar ${l.name}`} />
        </td>
      )}
      <td className="px-3 py-2"><NameCell line={l} error={error} lock={lock} /></td>
      <td className="px-3 py-2">
        {readOnly ? <QuantityText value={l.quantity} unit={unit} /> : (
          <QuantityField aria-label={`Quantidade de ${l.name}`} value={l.quantity} unit={unit} disabled={locked} invalid={!!error && !(l.quantity > 0)} onChange={(v) => patch(l.key, { quantity: v })} />
        )}
      </td>
      <td className="px-3 py-2">
        {readOnly ? <MoneyText value={l.unitPrice} /> : (
          <MoneyField aria-label={`Preço unitário de ${l.name}`} value={l.unitPrice} onChange={(v) => patch(l.key, { unitPrice: v })} />
        )}
      </td>
      {showCost && (
        <td className="px-3 py-2">
          {readOnly || mode === "sale" ? <MoneyText value={l.unitCost} /> : (
            <MoneyField aria-label={`Custo estimado de ${l.name}`} value={l.unitCost} disabled={locked} onChange={(v) => patch(l.key, { unitCost: v })} />
          )}
        </td>
      )}
      <td className="px-3 py-2 text-right"><MoneyText value={lineTotal(l)} /></td>
      {showCost && <td className="px-3 py-2 text-right"><Marginal line={l} /></td>}
      {renderAttendance && <td className="px-3 py-2">{renderAttendance(l)}</td>}
      {!readOnly && (
        <td className="px-1 py-2">
          <Button type="button" variant="ghost" size="icon" aria-label={`Remover ${l.name}`} disabled={locked} onClick={() => remove(l.key)}>
            <Trash2 className="text-danger" aria-hidden />
          </Button>
        </td>
      )}
    </tr>
  );
}

function LineCard({ line: l, mode, readOnly, showErrors, showCost, selected, selectable, patch, remove, toggle, unitOf, lockReason, renderAttendance }: RowProps) {
  const lock = lockReason(l);
  const locked = !!lock;
  const unit = unitOf(l);
  const error = showErrors ? lineError(l) : null;
  const label = (text: string) => <span className="mb-1 block text-xs text-muted-foreground">{text}</span>;
  return (
    <li className="space-y-3 rounded-lg border bg-card p-3">
      <div className="flex items-start gap-2">
        {selectable && (
          <input type="checkbox" className="mt-1 size-5" checked={!!selected} onChange={() => toggle(l.key)} aria-label={`Selecionar ${l.name}`} />
        )}
        <div className="min-w-0 flex-1"><NameCell line={l} error={error} lock={lock} /></div>
        {!readOnly && (
          <Button type="button" variant="ghost" size="icon" aria-label={`Remover ${l.name}`} disabled={locked} onClick={() => remove(l.key)}>
            <Trash2 className="text-danger" aria-hidden />
          </Button>
        )}
      </div>
      {readOnly ? (
        <p className="text-sm">
          <QuantityText value={l.quantity} unit={unit} /> × <MoneyText value={l.unitPrice} />
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            {label("Quantidade")}
            <QuantityField aria-label={`Quantidade de ${l.name}`} value={l.quantity} unit={unit} disabled={locked} invalid={!!error && !(l.quantity > 0)} onChange={(v) => patch(l.key, { quantity: v })} />
          </label>
          <label className="block">
            {label("Preço unit.")}
            <MoneyField aria-label={`Preço unitário de ${l.name}`} value={l.unitPrice} onChange={(v) => patch(l.key, { unitPrice: v })} />
          </label>
          {showCost && mode === "quote" && (
            <label className="col-span-2 block">
              {label("Custo estimado")}
              <MoneyField aria-label={`Custo estimado de ${l.name}`} value={l.unitCost} disabled={locked} onChange={(v) => patch(l.key, { unitCost: v })} />
            </label>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span>Total <strong><MoneyText value={lineTotal(l)} /></strong></span>
        {showCost && (
          <span className="text-muted-foreground">
            Custo <MoneyText value={lineCost(l)} /> · Margem <Marginal line={l} />
          </span>
        )}
      </div>
      {renderAttendance && <div className="text-sm">{renderAttendance(l)}</div>}
    </li>
  );
}

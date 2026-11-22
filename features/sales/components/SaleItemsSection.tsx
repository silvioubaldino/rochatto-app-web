"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ItemsGrid, diffLines, fromSaleItem, hasChanges, lineError, type ItemLine } from "@/components/entity/items-grid";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { SALE_ITEM_WARNING_LABELS } from "@/lib/format";
import type { Venda } from "@/lib/types";
import { attendanceView, lockReasonFor, type PurchaseInfo } from "../model";
import { useSaveSaleItems } from "../mutations";

/** Items e atendimento da venda (T06 §1): grade única, travas explicadas, salvar a diferença. */
export function SaleItemsSection({
  sale,
  purchases,
  readOnly,
  onDefineFulfillment,
}: {
  sale: Venda;
  purchases: Readonly<Record<string, PurchaseInfo>>;
  readOnly: boolean;
  onDefineFulfillment: (itemIds: string[]) => void;
}) {
  const original = (sale.itens ?? []).map(fromSaleItem);
  const [lines, setLines] = useState<ItemLine[]>(original);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [showErrors, setShowErrors] = useState(false);
  const save = useSaveSaleItems(sale.id, original);
  const dirty = hasChanges(diffLines(original, lines));

  async function onSave() {
    setShowErrors(true);
    if (lines.length === 0 || lines.some((l) => lineError(l))) return;
    const warnings = await save.mutate(lines);
    if (warnings?.length) toast.warning(SALE_ITEM_WARNING_LABELS[warnings[0]] ?? "Estoque insuficiente.");
  }

  return (
    <section aria-labelledby="sale-items" className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="sale-items" className="text-sm font-semibold">Items e atendimento</h2>
        {!readOnly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={selection.size === 0}
            onClick={() => onDefineFulfillment([...selection])}
          >
            Definir atendimento{selection.size > 0 ? ` (${selection.size})` : ""}
          </Button>
        )}
      </div>
      <ItemsGrid
        mode="sale"
        lines={lines}
        onChange={setLines}
        readOnly={readOnly}
        showErrors={showErrors}
        selection={selection}
        onSelectionChange={setSelection}
        lockReason={(l) => lockReasonFor(l, purchases)}
        renderAttendance={(l) => {
          const v = attendanceView(l, purchases);
          return v.tone ? <StatusBadge tone={v.tone}>{v.text}</StatusBadge> : <span>{v.text}</span>;
        }}
      />
      {dirty && !readOnly && (
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setLines(original)} disabled={save.pending}>Descartar</Button>
          <Button type="button" onClick={onSave} disabled={save.pending}>
            {save.pending && <Loader2 className="animate-spin" aria-hidden />}
            Salvar items
          </Button>
        </div>
      )}
    </section>
  );
}

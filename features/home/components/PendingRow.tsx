"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DateText, MoneyText } from "@/components/patterns/values";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { useSettleFlow } from "@/components/entity/settle-flow";
import { useConfirm, useUndoToast } from "@/components/patterns/ConfirmDialog";
import { useGeneratePurchase, useSetPurchaseStatus, queueItemIds } from "@/features/purchasing/mutations";
import { useSetDelivery } from "@/features/sales/mutations";
import { useRouter } from "next/navigation";
import type { PendingActionGroup, PendingActionItem, PendingSaleItemGroup } from "@/lib/types";
import { itemContext, itemHref, itemLabel, rowAction } from "../model";

export function PendingRow({
  kind,
  item,
  queue,
}: {
  kind: PendingActionGroup["kind"];
  item: PendingActionItem;
  queue: readonly PendingSaleItemGroup[];
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const undoable = useUndoToast();
  const delivery = useSetDelivery();
  const status = useSetPurchaseStatus();
  const generate = useGeneratePurchase();
  const settle = useSettleFlow();
  const action = rowAction(kind, item);
  const busy = delivery.pending || status.pending || generate.pending;

  async function run() {
    const id = item.entity.id;
    switch (action.id) {
      case "settle":
        settle.open({ obligationIds: [id] });
        return;
      case "deliver": {
        const ok = await delivery.mutate(id, "DELIVERED");
        if (ok !== undefined) undoable("Venda marcada como entregue.", () => delivery.mutate(id, "TO_DELIVER"));
        return;
      }
      case "mark-ordered":
        if ((await status.mutate(id, "ORDERED")) !== undefined) {
          undoable("Compra marcada como pedida.", () => status.mutate(id, "OPEN"));
        }
        return;
      case "mark-received": {
        const ok = await confirm({
          title: "Marcar compra como recebida",
          description: "A compra recebida entra no estoque (reposição) e libera os Items para entrega.",
          confirmLabel: "Marcar como recebida",
        });
        if (ok) await status.mutate(id, "RECEIVED");
        return;
      }
      case "generate-purchase": {
        const created = await generate.mutate(id, queueItemIds(queue, id));
        if (created) router.push(`/compras/${created.id}`);
        return;
      }
      case "define-supplier":
      case "link":
        if (action.href) router.push(action.href);
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
      <div className="min-w-0 flex-1 basis-48">
        <Link href={itemHref(kind, item)} className="block truncate font-medium hover:underline">
          {itemLabel(item)}
        </Link>
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
          {itemContext(kind, item) || <DateText value={item.date} />}
          {item.overdue && <StatusBadge tone="danger">Atrasada</StatusBadge>}
        </p>
      </div>
      {item.amount !== null && <MoneyText value={item.amount} tone={item.overdue ? "danger" : undefined} />}
      <Button size="sm" variant={item.overdue ? "default" : "outline"} onClick={run} disabled={busy}>
        {action.label}
      </Button>
    </li>
  );
}

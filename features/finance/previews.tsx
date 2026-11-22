"use client";

import Link from "next/link";
import { EntityLink } from "@/components/entity/EntityLink";
import { registerPreview, type PreviewData } from "@/components/entity/EntitySheet";
import { PreviewFields, PreviewSection, PreviewList } from "@/components/entity/preview-parts";
import { useSettleFlow } from "@/components/entity/settle-flow";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { DateText, MoneyText } from "@/components/patterns/values";
import { PAYMENT_METHOD_LABELS, formatCounterparty, obligationOriginHref } from "@/lib/format";
import type { Obligation } from "@/lib/types";
import { obligationDue, obligationTitle, obligationVerb } from "./model";
import { useObligation } from "./queries";

function useObligationPreview(id: string): PreviewData<Obligation> {
  const { obligation, isLoading, error, refresh } = useObligation(id);
  return { data: obligation, isLoading, error, retry: () => void refresh() };
}

function ObligationPreviewBody({ data }: { data: Obligation }) {
  const receiving = data.direction === "RECEIVABLE";
  const due = obligationDue(data);
  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        <StatusBadge kind="obligation" value={data.status} />
        {data.overdue && data.open > 0 && <StatusBadge tone="danger">Vencida</StatusBadge>}
      </div>
      <PreviewFields
        rows={[
          { label: receiving ? "Cliente" : "Credor", value: formatCounterparty(data.counterparty) },
          { label: "Origem", value: <Link href={obligationOriginHref(data.origin)} className="underline-offset-4 hover:underline">{data.origin.label}</Link> },
          { label: "Valor", value: <MoneyText value={data.amount} /> },
          { label: receiving ? "Recebido" : "Pago", value: <MoneyText value={data.settled} tone="success" /> },
          { label: "Em aberto", value: <MoneyText value={data.open} tone={data.open > 0 ? (data.overdue ? "danger" : "warning") : undefined} /> },
          { label: "Vencimento", value: <DateText value={due} tone={data.overdue ? "danger" : undefined} /> },
        ]}
      />
      {(data.installments?.length ?? 0) > 0 && (
        <PreviewSection title="Parcelas">
          <PreviewList
            items={data.installments ?? []}
            render={(i) => (
              <>
                <DateText value={i.due_date.slice(0, 10)} tone={i.overdue && i.status !== "COVERED" ? "danger" : undefined} />
                <span className="flex items-center gap-2"><MoneyText value={i.amount} /><StatusBadge kind="installment" value={i.status} /></span>
              </>
            )}
          />
        </PreviewSection>
      )}
      {(data.settlements?.length ?? 0) > 0 && (
        <PreviewSection title="Quitações">
          <PreviewList
            items={data.settlements ?? []}
            render={(s) => (
              <>
                <span><DateText value={s.movement.occurred_on.slice(0, 10)} /> · {s.movement.payment_method ? PAYMENT_METHOD_LABELS[s.movement.payment_method] : "forma não informada"}</span>
                <MoneyText value={s.amount} tone="success" />
              </>
            )}
          />
        </PreviewSection>
      )}
      <EntityLink type="obligation" id={data.id} className="text-sm">Abrir a conta</EntityLink>
    </>
  );
}

function ObligationPreviewActions({ data }: { data: Obligation }) {
  const settle = useSettleFlow();
  if (data.open <= 0) return null;
  return <Button type="button" onClick={() => settle.open({ obligations: [data] })}>{obligationVerb(data.direction)}</Button>;
}

registerPreview<Obligation>("obligation", {
  title: (o) => obligationTitle(o),
  useData: useObligationPreview,
  Body: ObligationPreviewBody,
  Actions: ObligationPreviewActions,
});

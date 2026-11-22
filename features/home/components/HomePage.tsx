"use client";

import { Suspense } from "react";
import { FilterBar } from "@/components/patterns/FilterBar";
import { EmptyState, ErrorState } from "@/components/patterns/states";
import { ListSkeleton } from "@/components/patterns/skeletons";
import { useUrlFilters } from "@/components/patterns/useUrlFilters";
import { usePendingPurchaseQueue } from "@/features/purchasing/queries";
import { formatDate } from "@/lib/format";
import { buildSections, DEFAULT_HORIZON, HORIZON_OPTIONS, parseHorizon } from "../model";
import { usePendingActions } from "../queries";
import { MonthSummary } from "./MonthSummary";
import { PendingGroupCard } from "./PendingGroupCard";

const FILTERS = { h: { default: DEFAULT_HORIZON } } as const;

function HomeContent() {
  const filters = useUrlFilters(FILTERS);
  const horizon = parseHorizon(filters.values.h);
  const { data, isLoading, error, refresh } = usePendingActions(horizon);
  const hasQueue = !!data?.groups.some((g) => g.kind === "ITEMS_TO_PURCHASE");
  const { groups: queue } = usePendingPurchaseQueue(hasQueue);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-bold md:text-2xl">Hoje{data ? ` · ${formatDate(data.today)}` : ""}</h1>
        <p className="text-sm text-muted-foreground">O que precisa da sua atenção, com a ação para resolver.</p>
      </header>

      <FilterBar
        chips={[
          {
            label: "Horizonte",
            options: HORIZON_OPTIONS,
            value: String(horizon),
            onChange: (v) => filters.set({ h: v }),
          },
        ]}
      />

      {error ? (
        <ErrorState onRetry={() => void refresh()} />
      ) : !data || (isLoading && !data) ? (
        <ListSkeleton rows={6} />
      ) : data.groups.length === 0 ? (
        <div className="rounded-lg border">
          <EmptyState title="Tudo em dia" description="Nenhuma pendência para este horizonte." />
        </div>
      ) : (
        buildSections(data.groups).map(({ section, groups }) => (
          <section key={section.id} aria-label={section.label} className="space-y-2">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{section.label}</h2>
            {groups.map((g) => (
              <PendingGroupCard key={g.kind} group={g} today={data.today} horizonDays={horizon} queue={queue} />
            ))}
          </section>
        ))
      )}

      {data && <MonthSummary today={data.today} />}
    </div>
  );
}

export function HomePage() {
  return (
    <Suspense fallback={<ListSkeleton rows={6} />}>
      <HomeContent />
    </Suspense>
  );
}

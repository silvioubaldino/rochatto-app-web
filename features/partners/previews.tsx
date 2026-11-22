"use client";

import { registerPreview, type PreviewData } from "@/components/entity/EntitySheet";
import { PreviewFields } from "@/components/entity/preview-parts";
import { usePartner } from "@/hooks/usePartners";
import { PARTNER_TYPE_LABELS } from "@/lib/format";
import type { Partner } from "@/lib/types";

function usePartnerPreview(id: string): PreviewData<Partner> {
  const { partner, isLoading, error, refresh } = usePartner(id);
  return { data: partner, isLoading, error, retry: () => void refresh() };
}

registerPreview<Partner>("partner", {
  title: (p) => p.name,
  useData: usePartnerPreview,
  Body: ({ data }) => (
    <PreviewFields
      rows={[
        { label: "Tipo", value: PARTNER_TYPE_LABELS[data.type] },
        { label: "Telefone", value: data.phone },
        { label: "Observações", value: data.notes },
      ]}
    />
  ),
});

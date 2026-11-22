import { describe, expect, it } from "vitest";
import { STATUS_TONES, statusMeta, TONE_SUBTLE_CLASSES } from "./tones";
import { SALE_DELIVERY_STATUS_LABELS } from "./labels";

describe("statusMeta (mapa único de rótulo + tom)", () => {
  it("segue a tabela de tons do AYD-011 UX-P12", () => {
    expect(statusMeta("quote", "OPEN")).toEqual({ label: "Aberto", tone: "warning" });
    expect(statusMeta("quote", "WON")).toEqual({ label: "Ganho", tone: "success" });
    expect(statusMeta("quote", "LOST")).toEqual({ label: "Perdido", tone: "danger" });
    expect(statusMeta("saleDelivery", "TO_DELIVER").tone).toBe("warning");
    expect(statusMeta("saleDelivery", "DELIVERED").tone).toBe("success");
    expect(statusMeta("saleDelivery", "CANCELED").tone).toBe("neutral");
    expect(statusMeta("purchase", "ORDERED").tone).toBe("warning");
    expect(statusMeta("purchase", "RECEIVED").tone).toBe("success");
    expect(statusMeta("obligation", "SETTLED").tone).toBe("success");
    expect(statusMeta("salePayment", "PAID").tone).toBe("success");
    expect(statusMeta("itemOrigin", "MADE_TO_ORDER").tone).toBe("info");
    expect(statusMeta("itemKind", "SERVICE").tone).toBe("info");
  });

  it("vencido força danger", () => {
    expect(statusMeta("obligation", "OPEN", { overdue: true }).tone).toBe("danger");
  });

  it("Sale só de serviço lê A executar / Executado", () => {
    expect(statusMeta("saleDelivery", "TO_DELIVER", { serviceOnly: true }).label).toBe("A executar");
    expect(statusMeta("saleDelivery", "DELIVERED", { serviceOnly: true }).label).toBe("Executado");
  });

  it("valor desconhecido ou vazio nunca mostra o código do enum", () => {
    expect(statusMeta("quote", "WHATEVER")).toEqual({ label: "—", tone: "neutral" });
    expect(statusMeta("quote", null)).toEqual({ label: "—", tone: "neutral" });
  });

  it("todo valor de enum conhecido tem rótulo e tom", () => {
    for (const status of Object.keys(SALE_DELIVERY_STATUS_LABELS)) {
      expect(STATUS_TONES.saleDelivery).toHaveProperty(status);
    }
    for (const tone of Object.keys(TONE_SUBTLE_CLASSES)) {
      expect(TONE_SUBTLE_CLASSES[tone as keyof typeof TONE_SUBTLE_CLASSES]).toContain(`text-${tone}`);
    }
  });
});

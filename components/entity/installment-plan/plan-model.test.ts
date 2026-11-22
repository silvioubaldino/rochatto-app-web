import { describe, expect, it } from "vitest";
import {
  downPaymentAmount,
  initialPlanState,
  planFromInstallments,
  planGap,
  planTotal,
  resolvePlan,
  splitEqual,
  toCustom,
  toInstallmentsPayload,
  validatePlan,
} from "./plan-model";

const TODAY = "2026-11-22";

describe("splitEqual", () => {
  it("centavos que sobram ficam na última parcela", () => {
    expect(splitEqual(100, 3)).toEqual([33.33, 33.33, 33.34]);
    expect(splitEqual(5842, 2)).toEqual([2921, 2921]);
  });
  it("a soma sempre fecha", () => {
    for (const [total, parts] of [[1000.01, 7], [0.05, 3], [99.99, 4]] as const) {
      expect(planTotal(splitEqual(total, parts).map((amount, i) => ({ key: String(i), due_date: TODAY, amount })))).toBe(total);
    }
  });
});

describe("presets", () => {
  const state = initialPlanState(TODAY);
  it("à vista: uma parcela hoje com o valor todo", () => {
    expect(resolvePlan({ ...state, preset: "cash" }, 5842, TODAY)).toMatchObject([{ due_date: TODAY, amount: 5842 }]);
  });
  it("entrada + saldo (50%): exemplo do T05", () => {
    const lines = resolvePlan(state, 5842, TODAY);
    expect(lines.map((l) => [l.due_date, l.amount])).toEqual([[TODAY, 2921], ["2026-11-29", 2921]]);
  });
  it("entrada 100% não gera saldo; 0% não gera entrada", () => {
    expect(resolvePlan({ ...state, downPercent: 100 }, 100, TODAY)).toHaveLength(1);
    expect(resolvePlan({ ...state, downPercent: 0 }, 100, TODAY).map((l) => l.key)).toEqual(["balance"]);
  });
  it("entrada arredonda em centavos e o saldo completa o total", () => {
    const lines = resolvePlan({ ...state, downPercent: 33 }, 100.01, TODAY);
    expect(planTotal(lines)).toBe(100.01);
    expect(downPaymentAmount(100.01, 33)).toBe(33.0);
  });
  it("parcelas iguais: mensais a partir da primeira", () => {
    const lines = resolvePlan({ ...state, preset: "equal", count: 3, firstDue: "2026-12-30" }, 100, TODAY);
    expect(lines.map((l) => l.due_date)).toEqual(["2026-12-30", "2027-01-30", "2027-02-28"]);
    expect(planTotal(lines)).toBe(100);
  });
  it("definir depois não gera parcelas; total zero também não", () => {
    expect(resolvePlan({ ...state, preset: "later" }, 100, TODAY)).toEqual([]);
    expect(resolvePlan(state, 0, TODAY)).toEqual([]);
  });
});

describe("personalizado e validação", () => {
  it("editar uma linha vira personalizado com as linhas atuais", () => {
    const custom = toCustom(initialPlanState(TODAY), 100, TODAY);
    expect(custom.preset).toBe("custom");
    expect(custom.lines).toHaveLength(2);
    expect(resolvePlan(custom, 100, TODAY)).toBe(custom.lines);
  });
  it("soma acima do total, valor zero e data vazia são recusados", () => {
    const l = (amount: number, due_date = TODAY) => ({ key: "k", due_date, amount });
    expect(validatePlan([l(60), l(60)], 100)).toMatch(/passa do valor/);
    expect(validatePlan([l(0)], 100)).toMatch(/maior que zero/);
    expect(validatePlan([l(10, "")], 100)).toMatch(/data/);
    expect(validatePlan([l(50), l(50)], 100)).toBeNull();
  });
  it("lacuna entre total e parcelas", () => {
    expect(planGap([{ key: "k", due_date: TODAY, amount: 40 }], 100)).toBe(60);
  });
  it("payload da api só leva a forma de pagamento quando existe", () => {
    expect(
      toInstallmentsPayload([
        { key: "a", due_date: TODAY, amount: 1, payment_method: "PIX" },
        { key: "b", due_date: TODAY, amount: 2 },
      ]),
    ).toEqual([
      { due_date: TODAY, amount: 1, payment_method: "PIX" },
      { due_date: TODAY, amount: 2 },
    ]);
  });
});

describe("plano existente", () => {
  it("vira personalizado com as parcelas (forma e observação preservadas)", () => {
    const state = planFromInstallments(
      [
        { id: "i1", due_date: "2026-12-01T00:00:00Z", amount: 60, payment_method: "PIX", notes: "entrada" },
        { id: "i2", due_date: "2026-12-15", amount: 40, payment_method: null, notes: null },
      ],
      TODAY,
    );
    expect(state.preset).toBe("custom");
    expect(toInstallmentsPayload(resolvePlan(state, 100, TODAY))).toEqual([
      { due_date: "2026-12-01", amount: 60, payment_method: "PIX", notes: "entrada" },
      { due_date: "2026-12-15", amount: 40 },
    ]);
  });
});

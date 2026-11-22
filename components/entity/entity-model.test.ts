import { describe, expect, it } from "vitest";
import {
  createOptionLabel,
  entityHref,
  formatPeek,
  normalizeText,
  parsePeek,
  peekQuery,
  pushRecent,
  rankOptions,
  shouldOfferCreate,
} from "./entity-model";

describe("prévia na URL", () => {
  it("ida e volta", () => {
    expect(formatPeek({ type: "sale", id: "abc" })).toBe("sale:abc");
    expect(parsePeek("sale:abc")).toEqual({ type: "sale", id: "abc" });
  });

  it("rejeita tipo desconhecido, id vazio e caracteres de URL", () => {
    expect(parsePeek("foo:1")).toBeNull();
    expect(parsePeek("sale:")).toBeNull();
    expect(parsePeek("sale")).toBeNull();
    expect(parsePeek(null)).toBeNull();
    expect(parsePeek("sale:a/b")).toBeNull();
    expect(parsePeek("sale:a b")).toBeNull();
  });

  it("peekQuery aplica e remove preservando filtros", () => {
    expect(peekQuery("status=OPEN", { type: "customer", id: "1" })).toBe("status=OPEN&peek=customer%3A1");
    expect(peekQuery("status=OPEN&peek=customer%3A1", null)).toBe("status=OPEN");
  });
});

describe("entityHref", () => {
  it("aponta para a página de cada tipo", () => {
    expect(entityHref("customer", "1")).toBe("/clientes/1");
    expect(entityHref("quote", "1")).toBe("/orcamentos/1");
    expect(entityHref("sale", "1")).toBe("/vendas/1");
    expect(entityHref("purchase", "1")).toBe("/compras/1");
    expect(entityHref("obligation", "1")).toBe("/contas/1");
    expect(entityHref("partner", "1")).toBe("/parceiros/1");
    expect(entityHref("product", "1")).toBe("/produtos");
    expect(entityHref("service", "1")).toBe("/servicos");
    expect(entityHref("supplier", "1")).toBe("/fornecedores");
  });
});

describe("normalizeText", () => {
  it("tira acento, caixa e espaços das pontas", () => {
    expect(normalizeText("  Mármore Ônix ")).toBe("marmore onix");
  });
});

describe("rankOptions", () => {
  const options = [
    { id: "1", label: "Pedras do Sul" },
    { id: "2", label: "Matheus Transportes" },
    { id: "3", label: "Matheus RJ" },
    { id: "4", label: "Rodrigo Matheus" },
  ];

  it("filtra por conter, sem acento, e põe quem COMEÇA com o termo antes", () => {
    expect(rankOptions(options, "mathe").map((o) => o.id)).toEqual(["2", "3", "4"]);
    expect(rankOptions(options, "PEDRAS").map((o) => o.id)).toEqual(["1"]);
    expect(rankOptions(options, "zzz")).toEqual([]);
  });

  it("preferidos do contexto vêm primeiro (ex.: fornecedor de pedra)", () => {
    const stone = new Set(["3"]);
    expect(rankOptions(options, "mathe", { prefer: (o) => stone.has(o.id) }).map((o) => o.id)).toEqual(["3", "2", "4"]);
  });

  it("sem termo, recentes primeiro na ordem de uso", () => {
    expect(rankOptions(options, "", { recents: ["4", "1"] }).map((o) => o.id)).toEqual(["4", "1", "2", "3"]);
  });
});

describe("criar", () => {
  it("oferece criar só com texto e sem nome idêntico", () => {
    const options = [{ id: "1", label: "Fulano" }];
    expect(shouldOfferCreate("", options)).toBe(false);
    expect(shouldOfferCreate("fulano", options)).toBe(false);
    expect(shouldOfferCreate("Fula", options)).toBe(true);
  });

  it("rótulo na linguagem do dono", () => {
    expect(createOptionLabel("customer", " Fulano ")).toBe('＋ Criar cliente "Fulano"');
    expect(createOptionLabel("supplier", "")).toBe("＋ Criar fornecedor");
  });
});

describe("pushRecent", () => {
  it("move para o início, sem repetir e com limite", () => {
    expect(pushRecent(["a", "b", "c"], "b")).toEqual(["b", "a", "c"]);
    expect(pushRecent(["a", "b"], "z", 2)).toEqual(["z", "a"]);
  });
});

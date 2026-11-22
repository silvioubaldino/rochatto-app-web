import { describe, expect, it } from "vitest";
import { ariaSort, groupRows, nextSort, sortRows } from "./data-table-model";

interface Row {
  id: number;
  name: string;
  total: number | null;
  city: string;
}

const rows: Row[] = [
  { id: 1, name: "Bruno", total: 30, city: "Campo Grande" },
  { id: 2, name: "ana", total: null, city: "Bonito" },
  { id: 3, name: "Carla", total: 10, city: "Bonito" },
  { id: 4, name: "Álvaro", total: 20, city: "" },
];
const columns = [
  { id: "name", sortValue: (r: Row) => r.name },
  { id: "total", sortValue: (r: Row) => r.total },
  { id: "plain" },
];

describe("nextSort", () => {
  it("alterna asc → desc → sem ordenação", () => {
    const a = nextSort(null, "name");
    expect(a).toEqual({ id: "name", dir: "asc" });
    const d = nextSort(a, "name");
    expect(d).toEqual({ id: "name", dir: "desc" });
    expect(nextSort(d, "name")).toBeNull();
  });

  it("outra coluna recomeça em asc", () => {
    expect(nextSort({ id: "name", dir: "desc" }, "total")).toEqual({ id: "total", dir: "asc" });
  });
});

describe("sortRows", () => {
  it("ordena texto sem diferenciar acento/caixa e números por valor", () => {
    expect(sortRows(rows, columns, { id: "name", dir: "asc" }).map((r) => r.name)).toEqual(["Álvaro", "ana", "Bruno", "Carla"]);
    expect(sortRows(rows, columns, { id: "total", dir: "asc" }).map((r) => r.total)).toEqual([10, 20, 30, null]);
  });

  it("vazios ficam sempre no fim, até em desc", () => {
    expect(sortRows(rows, columns, { id: "total", dir: "desc" }).map((r) => r.total)).toEqual([30, 20, 10, null]);
  });

  it("não muta a entrada e ignora coluna sem sortValue", () => {
    const copy = [...rows];
    sortRows(rows, columns, { id: "name", dir: "desc" });
    expect(rows).toEqual(copy);
    expect(sortRows(rows, columns, { id: "plain", dir: "asc" })).toEqual(rows);
    expect(sortRows(rows, columns, null)).toEqual(rows);
  });

  it("é estável nos empates", () => {
    const tie = [
      { id: 1, name: "x", total: 1, city: "" },
      { id: 2, name: "x", total: 1, city: "" },
    ];
    expect(sortRows(tie, columns, { id: "total", dir: "asc" }).map((r) => r.id)).toEqual([1, 2]);
    expect(sortRows(tie, columns, { id: "total", dir: "desc" }).map((r) => r.id)).toEqual([1, 2]);
  });
});

describe("groupRows", () => {
  it("agrupa preservando a ordem dentro do grupo e ordena os grupos", () => {
    const groups = groupRows(rows, (r) => r.city || "Sem cidade", { lastKeys: ["Sem cidade"] });
    expect(groups.map((g) => g.key)).toEqual(["Bonito", "Campo Grande", "Sem cidade"]);
    expect(groups[0].rows.map((r) => r.id)).toEqual([2, 3]);
  });

  it("respeita a ordem fixa e põe o resto depois", () => {
    const groups = groupRows(rows, (r) => r.city || "Sem cidade", { order: ["Campo Grande"], lastKeys: ["Sem cidade"] });
    expect(groups.map((g) => g.key)).toEqual(["Campo Grande", "Bonito", "Sem cidade"]);
  });

  it("lista vazia → nenhum grupo", () => {
    expect(groupRows([], () => "x")).toEqual([]);
  });
});

describe("ariaSort", () => {
  it("traduz o estado", () => {
    expect(ariaSort({ id: "a", dir: "asc" }, "a")).toBe("ascending");
    expect(ariaSort({ id: "a", dir: "desc" }, "a")).toBe("descending");
    expect(ariaSort({ id: "a", dir: "desc" }, "b")).toBe("none");
    expect(ariaSort(null, "a")).toBe("none");
  });
});

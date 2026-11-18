"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Lock, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { api, APIError } from "@/lib/api";
import {
  ITEM_ORIGINS,
  ITEM_ORIGIN_LABELS,
  SALE_ITEM_WARNING_LABELS,
  formatMoeda,
  formatQuantidade,
} from "@/lib/formatters";
import {
  itemToDraft,
  toSaleItemPayload,
  validateSaleItemDraft,
  type SaleItemDraft,
} from "@/lib/sales";
import type {
  Fornecedor,
  ItemOrigin,
  ItemVenda,
  ItemVendaWriteResponse,
  Produto,
  SaleItemWarning,
} from "@/lib/types";
import { parseDecimal } from "@/lib/schemas";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProductPicker } from "./ProductPicker";

const EMPTY_DRAFT: SaleItemDraft = {
  produto_id: null,
  produto_nome: "",
  fornecedor_id: null,
  fornecedor_nome: null,
  quantidade: 0,
  preco_venda_unit: 0,
  custo_unit: 0,
  origin: "MADE_TO_ORDER",
};

const selectClass = "h-7 rounded-md border border-input bg-background px-2 text-sm";

interface SaleItemsCardProps {
  vendaId: string;
  itens: ItemVenda[];
  /** Sale CANCELED: somente leitura (a API responde 409 a qualquer alteração). */
  readOnly: boolean;
  produtos: Produto[];
  fornecedores: Fornecedor[];
  onChanged: () => void;
}

/**
 * Items da Sale com origem (Sob encomenda / De estoque) e Supplier por Item — AYD-002 §1.
 * Item numa Purchase tem origem, Supplier, quantidade e custo travados (só o preço muda).
 */
export function SaleItemsCard({
  vendaId,
  itens,
  readOnly,
  produtos,
  fornecedores,
  onChanged,
}: SaleItemsCardProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SaleItemDraft>(EMPTY_DRAFT);
  const [qtyText, setQtyText] = useState("");
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<ItemVenda | null>(null);
  // Feedback da última gravação (só nesta sessão da página).
  const [warnings, setWarnings] = useState<Record<string, SaleItemWarning[]>>({});
  const [autoCost, setAutoCost] = useState<Record<string, boolean>>({});

  const editingItem = itens.find((i) => i.id === editingId) ?? null;
  const locked = !!editingItem?.purchase_id;

  function startEdit(item: ItemVenda) {
    setAdding(false);
    setEditingId(item.id);
    setDraft(itemToDraft(item));
    setQtyText(String(item.quantidade).replace(".", ","));
  }

  function startAdd() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setQtyText("");
    setAdding(true);
  }

  function cancel() {
    setEditingId(null);
    setAdding(false);
  }

  function changeOrigin(origin: ItemOrigin) {
    setDraft((d) => {
      if (origin === d.origin) return d;
      if (origin === "FROM_STOCK") {
        // Custo em branco → a API aplica o custo da última entrada (RN-16).
        return { ...d, origin, custo_unit: null };
      }
      const produto = produtos.find((p) => p.id === d.produto_id);
      return {
        ...d,
        origin,
        custo_unit: editingItem?.custo_unit ?? produto?.custo_referencia ?? 0,
      };
    });
  }

  function selectProduct(p: Produto) {
    setDraft((d) => ({
      ...d,
      produto_id: p.id,
      produto_nome: p.nome,
      preco_venda_unit: p.preco_referencia ?? d.preco_venda_unit,
      custo_unit: d.custo_unit === null ? null : (p.custo_referencia ?? d.custo_unit),
    }));
  }

  async function save() {
    const current: SaleItemDraft = { ...draft, quantidade: parseDecimal(qtyText) };
    const errorMsg = validateSaleItemDraft(current);
    if (errorMsg) {
      toast.error(errorMsg);
      return;
    }
    setSaving(true);
    try {
      const payload = toSaleItemPayload(current);
      const res = editingId
        ? await api.put<ItemVendaWriteResponse>(`/vendas/${vendaId}/itens/${editingId}`, payload)
        : await api.post<ItemVendaWriteResponse>(`/vendas/${vendaId}/itens`, payload);
      toast.success(editingId ? "Item atualizado." : "Item adicionado.");

      const itemId = res?.id ?? editingId;
      if (itemId) {
        const w = res?.warnings ?? [];
        setWarnings((prev) => ({ ...prev, [itemId]: w }));
        for (const code of w) {
          toast.warning(SALE_ITEM_WARNING_LABELS[code] ?? code);
        }
        const filled = current.custo_unit === null && current.origin === "FROM_STOCK";
        setAutoCost((prev) => ({ ...prev, [itemId]: filled }));
        if (filled && res) {
          toast.info(
            `Custo preenchido com a última entrada do estoque: ${formatMoeda(res.custo_unit)}.`,
          );
        }
      }
      cancel();
      onChanged();
    } catch (err) {
      toast.error(err instanceof APIError ? err.message : "Erro ao salvar item.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await api.delete(`/vendas/${vendaId}/itens/${deleting.id}`);
      toast.success("Item removido.");
      onChanged();
    } catch (err) {
      toast.error(err instanceof APIError ? err.message : "Erro ao remover item.");
    } finally {
      setDeleting(null);
    }
  }

  function supplierSelect() {
    return (
      <select
        value={draft.fornecedor_id ?? ""}
        onChange={(e) => {
          const f = fornecedores.find((x) => x.id === e.target.value);
          setDraft((d) => ({
            ...d,
            fornecedor_id: f?.id ?? null,
            fornecedor_nome: f?.nome ?? null,
          }));
        }}
        className={`${selectClass} w-36`}
      >
        <option value="">Sem fornecedor</option>
        {fornecedores.map((f) => (
          <option key={f.id} value={f.id}>
            {f.nome}
          </option>
        ))}
      </select>
    );
  }

  function costInput() {
    if (draft.origin === "FROM_STOCK" && draft.custo_unit === null) {
      return (
        <div className="flex items-center justify-end gap-1">
          <span className="text-xs text-muted-foreground" title="A API usa o custo da última entrada do produto">
            Última entrada
          </span>
          <Button
            variant="ghost"
            size="icon-xs"
            title="Informar o custo manualmente"
            onClick={() => setDraft((d) => ({ ...d, custo_unit: 0 }))}
          >
            <Pencil className="h-3 w-3" />
          </Button>
        </div>
      );
    }
    return (
      <MoneyInput
        value={draft.custo_unit ?? 0}
        onChange={(v) => setDraft((d) => ({ ...d, custo_unit: v }))}
        className="h-7 w-24 text-right text-sm"
      />
    );
  }

  function editActions() {
    return (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon-xs" onClick={save} disabled={saving} title="Salvar">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        </Button>
        <Button variant="ghost" size="icon-xs" onClick={cancel} disabled={saving} title="Cancelar">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  function purchaseCell(item: ItemVenda) {
    if (item.purchase_id) {
      return (
        <Link
          href={`/compras/${item.purchase_id}`}
          className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 hover:underline"
          title="Item numa compra — origem, fornecedor, quantidade e custo travados"
        >
          <Lock className="h-3 w-3" />
          Compra #{item.purchase_id.slice(0, 8)}
        </Link>
      );
    }
    if (item.origin === "MADE_TO_ORDER") {
      return (
        <span className="text-xs text-muted-foreground">
          {item.fornecedor_id ? "A comprar" : "Defina o fornecedor"}
        </span>
      );
    }
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">Itens da Venda</h2>
        {!readOnly && (
          <Button variant="outline" size="sm" onClick={startAdd} disabled={adding}>
            <Plus className="h-3.5 w-3.5" />
            Adicionar item
          </Button>
        )}
      </div>

      {locked && editingItem?.purchase_id && (
        <p className="flex items-start gap-2 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-900">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Este item está na{" "}
            <Link href={`/compras/${editingItem.purchase_id}`} className="font-medium underline">
              Compra #{editingItem.purchase_id.slice(0, 8)}
            </Link>
            . Origem, fornecedor, quantidade e custo só mudam depois de removê-lo da compra (possível
            enquanto ela está Aberta). O preço de venda continua editável.
          </span>
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 pr-3 font-medium">Produto</th>
              <th className="pb-2 pr-3 font-medium">Origem</th>
              <th className="pb-2 pr-3 font-medium">Fornecedor</th>
              <th className="pb-2 pr-3 font-medium text-right">Qtd</th>
              <th className="pb-2 pr-3 font-medium text-right">Preço unit.</th>
              <th className="pb-2 pr-3 font-medium text-right">Custo unit.</th>
              <th className="pb-2 pr-3 font-medium text-right">Total</th>
              <th className="pb-2 pr-3 font-medium">Compra</th>
              {!readOnly && <th className="pb-2 font-medium w-16">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {itens.length === 0 && !adding && (
              <tr>
                <td colSpan={9} className="py-6 text-center text-muted-foreground">
                  Nenhum item.
                </td>
              </tr>
            )}
            {itens.map((item) => {
              const itemWarnings = warnings[item.id] ?? [];
              if (editingId === item.id) {
                return (
                  <tr key={item.id} className="border-b bg-muted/20">
                    <td className="py-2 pr-3">{item.produto_nome}</td>
                    <td className="py-2 pr-3">
                      {locked ? (
                        ITEM_ORIGIN_LABELS[item.origin]
                      ) : (
                        <select
                          value={draft.origin}
                          onChange={(e) => changeOrigin(e.target.value as ItemOrigin)}
                          className={selectClass}
                        >
                          {ITEM_ORIGINS.map((o) => (
                            <option key={o} value={o}>
                              {ITEM_ORIGIN_LABELS[o]}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      {locked
                        ? item.fornecedor_nome || "—"
                        : draft.origin === "FROM_STOCK"
                          ? <span className="text-muted-foreground">Estoque</span>
                          : supplierSelect()}
                    </td>
                    <td className="py-2 pr-3 text-right">
                      {locked ? (
                        formatQuantidade(item.quantidade)
                      ) : (
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={qtyText}
                          onChange={(e) => {
                            if (/^[0-9]*[,.]?[0-9]*$/.test(e.target.value)) setQtyText(e.target.value);
                          }}
                          className="h-7 w-16 text-right text-sm"
                        />
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <MoneyInput
                        value={draft.preco_venda_unit}
                        onChange={(v) => setDraft((d) => ({ ...d, preco_venda_unit: v }))}
                        className="h-7 w-24 text-right text-sm"
                      />
                    </td>
                    <td className="py-2 pr-3 text-right">
                      {locked ? formatMoeda(item.custo_unit) : costInput()}
                    </td>
                    <td className="py-2 pr-3 text-right text-muted-foreground">—</td>
                    <td className="py-2 pr-3">{purchaseCell(item)}</td>
                    <td className="py-2">{editActions()}</td>
                  </tr>
                );
              }
              return (
                <tr key={item.id} className="border-b last:border-b-0 align-top">
                  <td className="py-2 pr-3">
                    {item.produto_nome}
                    {itemWarnings.length > 0 && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-amber-700">
                        <AlertTriangle className="h-3 w-3" />
                        Saldo insuficiente em estoque
                      </p>
                    )}
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap">{ITEM_ORIGIN_LABELS[item.origin] ?? "—"}</td>
                  <td className="py-2 pr-3">
                    {item.origin === "FROM_STOCK" ? (
                      <span className="text-muted-foreground">Estoque</span>
                    ) : (
                      item.fornecedor_nome || <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-right">{formatQuantidade(item.quantidade)}</td>
                  <td className="py-2 pr-3 text-right">{formatMoeda(item.preco_venda_unit)}</td>
                  <td className="py-2 pr-3 text-right">
                    {formatMoeda(item.custo_unit)}
                    {autoCost[item.id] && (
                      <p className="text-xs text-muted-foreground">última entrada</p>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-right">{formatMoeda(item.total_venda)}</td>
                  <td className="py-2 pr-3">{purchaseCell(item)}</td>
                  {!readOnly && (
                    <td className="py-2">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => startEdit(item)}
                          disabled={adding || (editingId !== null && editingId !== item.id)}
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setDeleting(item)}
                          disabled={!!item.purchase_id}
                          title={
                            item.purchase_id
                              ? "Item numa compra — remova-o da compra antes"
                              : "Remover"
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}

            {adding && (
              <tr className="border-b bg-muted/20">
                <td className="py-2 pr-3 min-w-40">
                  <ProductPicker
                    produtos={produtos}
                    value={draft.produto_nome}
                    onTextChange={(text) =>
                      setDraft((d) => ({ ...d, produto_nome: text, produto_id: null }))
                    }
                    onSelect={selectProduct}
                    className="h-7 text-sm"
                  />
                </td>
                <td className="py-2 pr-3">
                  <select
                    value={draft.origin}
                    onChange={(e) => changeOrigin(e.target.value as ItemOrigin)}
                    className={selectClass}
                  >
                    {ITEM_ORIGINS.map((o) => (
                      <option key={o} value={o}>
                        {ITEM_ORIGIN_LABELS[o]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-3">
                  {draft.origin === "FROM_STOCK" ? (
                    <span className="text-muted-foreground">Estoque</span>
                  ) : (
                    supplierSelect()
                  )}
                </td>
                <td className="py-2 pr-3 text-right">
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={qtyText}
                    onChange={(e) => {
                      if (/^[0-9]*[,.]?[0-9]*$/.test(e.target.value)) setQtyText(e.target.value);
                    }}
                    className="h-7 w-16 text-right text-sm"
                  />
                </td>
                <td className="py-2 pr-3 text-right">
                  <MoneyInput
                    value={draft.preco_venda_unit}
                    onChange={(v) => setDraft((d) => ({ ...d, preco_venda_unit: v }))}
                    className="h-7 w-24 text-right text-sm"
                  />
                </td>
                <td className="py-2 pr-3 text-right">{costInput()}</td>
                <td className="py-2 pr-3" />
                <td className="py-2 pr-3" />
                <td className="py-2">{editActions()}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <DeleteConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Remover item"
        description={`Tem certeza que deseja remover "${deleting?.produto_nome ?? "este item"}"?`}
      />
    </Card>
  );
}

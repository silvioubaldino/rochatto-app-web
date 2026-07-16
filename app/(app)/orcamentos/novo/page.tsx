"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { api, APIError } from "@/lib/api";
import { formatMoeda } from "@/lib/formatters";
import type { Cliente, Produto, Fornecedor } from "@/lib/types";
import { useClientes } from "@/hooks/useClientes";
import { useProdutos } from "@/hooks/useProdutos";
import { useFornecedores } from "@/hooks/useFornecedores";
import { useVendedoresExternos } from "@/hooks/useVendedoresExternos";
import { ClienteModal } from "@/components/forms/ClienteModal";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Plus, Trash2, ArrowLeft, Search } from "lucide-react";

const itemSchema = z.object({
  product_id: z.string().optional(),
  product_name: z.string().min(1, "Produto é obrigatório"),
  supplier_id: z.string().optional(),
  supplier_name: z.string().optional(),
  quantity: z.number().min(0.01, "Quantidade deve ser maior que 0"),
  unit_price: z.number().min(0, "Preço inválido"),
  unit_cost: z.number().min(0, "Custo inválido"),
});

const quoteSchema = z.object({
  customer_id: z.string().min(1, "Cliente é obrigatório"),
  quote_date: z.string().min(1, "Data é obrigatória"),
  referrer_id: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, "Adicione pelo menos um item"),
});

type QuoteFormData = z.infer<typeof quoteSchema>;

function AutocompleteDropdown<T extends { id: string }>({
  items,
  show,
  onSelect,
  renderLabel,
}: {
  items: T[];
  show: boolean;
  onSelect: (item: T) => void;
  renderLabel: (item: T) => string;
}) {
  if (!show || items.length === 0) return null;
  return (
    <div className="absolute top-full left-0 z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md">
      {items.slice(0, 8).map((item) => (
        <button
          key={item.id}
          type="button"
          className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
          onMouseDown={() => onSelect(item)}
        >
          {renderLabel(item)}
        </button>
      ))}
    </div>
  );
}

export default function NovoOrcamentoPage() {
  const router = useRouter();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      customer_id: "",
      quote_date: format(new Date(), "yyyy-MM-dd"),
      referrer_id: "",
      notes: "",
      items: [
        {
          product_id: "",
          product_name: "",
          supplier_id: "",
          supplier_name: "",
          quantity: 0,
          unit_price: 0,
          unit_cost: 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const watchItems = watch("items");

  const [clienteSearch, setClienteSearch] = useState("");
  const [debouncedClienteSearch, setDebouncedClienteSearch] = useState("");
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const [selectedClienteNome, setSelectedClienteNome] = useState("");
  const [clienteModalOpen, setClienteModalOpen] = useState(false);

  const [produtoSearches, setProdutoSearches] = useState<Record<number, string>>({});
  const [showProdutoDropdown, setShowProdutoDropdown] = useState<Record<number, boolean>>({});

  const [fornecedorSearches, setFornecedorSearches] = useState<Record<number, string>>({});
  const [showFornecedorDropdown, setShowFornecedorDropdown] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedClienteSearch(clienteSearch), 300);
    return () => clearTimeout(timer);
  }, [clienteSearch]);

  const { clientes, refresh: refreshClientes } = useClientes(debouncedClienteSearch || undefined);
  const { produtos } = useProdutos();
  const { fornecedores } = useFornecedores();
  const { vendedoresExternos } = useVendedoresExternos();

  const filteredProdutos = useCallback(
    (index: number) => {
      const search = (produtoSearches[index] || "").toLowerCase();
      if (!search) return [];
      return produtos.filter((p) => p.nome.toLowerCase().includes(search));
    },
    [produtos, produtoSearches],
  );

  const filteredFornecedores = useCallback(
    (index: number) => {
      const search = (fornecedorSearches[index] || "").toLowerCase();
      if (!search) return [];
      return fornecedores.filter((f) => f.nome.toLowerCase().includes(search));
    },
    [fornecedores, fornecedorSearches],
  );

  const totalQuote = useMemo(() => {
    return (watchItems || []).reduce(
      (acc, item) => acc + (item.quantity || 0) * (item.unit_price || 0),
      0,
    );
  }, [watchItems]);

  function handleSelectCliente(cliente: Cliente) {
    setValue("customer_id", cliente.id);
    setSelectedClienteNome(cliente.nome);
    setClienteSearch("");
    setShowClienteDropdown(false);
  }

  function handleSelectProduto(index: number, produto: Produto) {
    setValue(`items.${index}.product_id`, produto.id);
    setValue(`items.${index}.product_name`, produto.nome);
    if (produto.preco_referencia) setValue(`items.${index}.unit_price`, produto.preco_referencia);
    if (produto.custo_referencia) setValue(`items.${index}.unit_cost`, produto.custo_referencia);
    setProdutoSearches((prev) => ({ ...prev, [index]: "" }));
    setShowProdutoDropdown((prev) => ({ ...prev, [index]: false }));
  }

  function handleSelectFornecedor(index: number, fornecedor: Fornecedor) {
    setValue(`items.${index}.supplier_id`, fornecedor.id);
    setValue(`items.${index}.supplier_name`, fornecedor.nome);
    setFornecedorSearches((prev) => ({ ...prev, [index]: "" }));
    setShowFornecedorDropdown((prev) => ({ ...prev, [index]: false }));
  }

  function addItem() {
    append({
      product_id: "",
      product_name: "",
      supplier_id: "",
      supplier_name: "",
      quantity: 0,
      unit_price: 0,
      unit_cost: 0,
    });
  }

  async function onSubmit(data: QuoteFormData) {
    try {
      const payload = {
        ...data,
        referrer_id: data.referrer_id || undefined,
        notes: data.notes || undefined,
      };
      const created = await api.post<{ id: string }>("/quotes", payload);
      toast.success("Orçamento criado com sucesso!");
      router.push(`/orcamentos/${created.id}`);
    } catch (err) {
      const message = err instanceof APIError ? err.message : "Erro ao criar orçamento.";
      toast.error(message);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/orcamentos")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Novo Orçamento</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* DADOS GERAIS */}
        <Card className="p-4 space-y-4">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">
            Dados Gerais
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Cliente */}
            <div className="space-y-2 relative">
              <Label>Cliente *</Label>
              {selectedClienteNome ? (
                <div className="flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm">
                  <span className="flex-1">{selectedClienteNome}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setValue("customer_id", "");
                      setSelectedClienteNome("");
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <span className="sr-only">Remover</span>
                    &times;
                  </button>
                </div>
              ) : (
                <div className="flex gap-1">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar cliente..."
                      value={clienteSearch}
                      onChange={(e) => {
                        setClienteSearch(e.target.value);
                        setShowClienteDropdown(true);
                      }}
                      onFocus={() => clienteSearch && setShowClienteDropdown(true)}
                      onBlur={() => setTimeout(() => setShowClienteDropdown(false), 200)}
                      className="pl-7"
                    />
                    <AutocompleteDropdown
                      items={clientes}
                      show={showClienteDropdown}
                      onSelect={handleSelectCliente}
                      renderLabel={(c) => c.nome}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setClienteModalOpen(true)}
                    title="Novo cliente"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <input type="hidden" {...register("customer_id")} />
              {errors.customer_id && (
                <p className="text-xs text-destructive">{errors.customer_id.message}</p>
              )}
            </div>

            {/* Data */}
            <div className="space-y-2">
              <Label htmlFor="quote_date">Data *</Label>
              <Input id="quote_date" type="date" {...register("quote_date")} />
              {errors.quote_date && (
                <p className="text-xs text-destructive">{errors.quote_date.message}</p>
              )}
            </div>

            {/* Partner / lead source */}
            <div className="space-y-2">
              <Label htmlFor="referrer_id">Indicação (Partner)</Label>
              <select
                id="referrer_id"
                {...register("referrer_id")}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Nenhuma</option>
                {vendedoresExternos.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* ITENS */}
        <Card className="p-4 space-y-4">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">
            Itens do Orçamento
          </h2>

          <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_80px_110px_110px_32px] gap-2 text-xs font-medium text-muted-foreground px-1">
            <span>Produto</span>
            <span>Fornecedor</span>
            <span>Qtd</span>
            <span>Preço Venda</span>
            <span>Custo</span>
            <span />
          </div>

          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_80px_110px_110px_32px] gap-2 items-start rounded-md border p-2 sm:border-0 sm:p-0"
            >
              {/* Produto */}
              <div className="relative">
                <label className="text-xs text-muted-foreground sm:hidden">Produto</label>
                <Input
                  placeholder="Buscar produto..."
                  value={
                    produtoSearches[index] !== undefined
                      ? produtoSearches[index]
                      : watchItems?.[index]?.product_name || ""
                  }
                  onChange={(e) => {
                    setProdutoSearches((prev) => ({ ...prev, [index]: e.target.value }));
                    setValue(`items.${index}.product_name`, e.target.value);
                    setValue(`items.${index}.product_id`, "");
                    setShowProdutoDropdown((prev) => ({ ...prev, [index]: true }));
                  }}
                  onFocus={() => {
                    if (produtoSearches[index]) {
                      setShowProdutoDropdown((prev) => ({ ...prev, [index]: true }));
                    }
                  }}
                  onBlur={() =>
                    setTimeout(
                      () => setShowProdutoDropdown((prev) => ({ ...prev, [index]: false })),
                      200,
                    )
                  }
                  className="h-8 text-sm"
                />
                <AutocompleteDropdown
                  items={filteredProdutos(index)}
                  show={showProdutoDropdown[index] || false}
                  onSelect={(p) => handleSelectProduto(index, p)}
                  renderLabel={(p) => p.nome}
                />
                {errors.items?.[index]?.product_name && (
                  <p className="text-xs text-destructive">
                    {errors.items[index].product_name?.message}
                  </p>
                )}
              </div>

              {/* Fornecedor */}
              <div className="relative">
                <label className="text-xs text-muted-foreground sm:hidden">Fornecedor</label>
                <Input
                  placeholder="Fornecedor..."
                  value={
                    fornecedorSearches[index] !== undefined
                      ? fornecedorSearches[index]
                      : watchItems?.[index]?.supplier_name || ""
                  }
                  onChange={(e) => {
                    setFornecedorSearches((prev) => ({ ...prev, [index]: e.target.value }));
                    setValue(`items.${index}.supplier_name`, e.target.value);
                    setValue(`items.${index}.supplier_id`, "");
                    setShowFornecedorDropdown((prev) => ({ ...prev, [index]: true }));
                  }}
                  onFocus={() => {
                    if (fornecedorSearches[index]) {
                      setShowFornecedorDropdown((prev) => ({ ...prev, [index]: true }));
                    }
                  }}
                  onBlur={() =>
                    setTimeout(
                      () => setShowFornecedorDropdown((prev) => ({ ...prev, [index]: false })),
                      200,
                    )
                  }
                  className="h-8 text-sm"
                />
                <AutocompleteDropdown
                  items={filteredFornecedores(index)}
                  show={showFornecedorDropdown[index] || false}
                  onSelect={(f) => handleSelectFornecedor(index, f)}
                  renderLabel={(f) => f.nome}
                />
              </div>

              {/* Quantidade */}
              <div>
                <label className="text-xs text-muted-foreground sm:hidden">Qtd</label>
                <Controller
                  control={control}
                  name={`items.${index}.quantity`}
                  render={({ field: f }) => (
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      value={f.value || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^[0-9]*[,.]?[0-9]*$/.test(val)) {
                          f.onChange(parseFloat(val.replace(",", ".")) || 0);
                        }
                      }}
                      className="h-8 text-sm"
                    />
                  )}
                />
                {errors.items?.[index]?.quantity && (
                  <p className="text-xs text-destructive">
                    {errors.items[index].quantity?.message}
                  </p>
                )}
              </div>

              {/* Preço Venda */}
              <div>
                <label className="text-xs text-muted-foreground sm:hidden">Preço Venda</label>
                <Controller
                  control={control}
                  name={`items.${index}.unit_price`}
                  render={({ field: f }) => (
                    <MoneyInput value={f.value} onChange={f.onChange} className="h-8 text-sm" />
                  )}
                />
              </div>

              {/* Custo */}
              <div>
                <label className="text-xs text-muted-foreground sm:hidden">Custo</label>
                <Controller
                  control={control}
                  name={`items.${index}.unit_cost`}
                  render={({ field: f }) => (
                    <MoneyInput value={f.value} onChange={f.onChange} className="h-8 text-sm" />
                  )}
                />
              </div>

              {/* Remove */}
              <div className="flex items-end sm:items-center justify-end sm:justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => remove(index)}
                  disabled={fields.length <= 1}
                  title="Remover item"
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ))}

          {errors.items?.root && (
            <p className="text-xs text-destructive">{errors.items.root.message}</p>
          )}

          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-3.5 w-3.5" />
            Adicionar Produto
          </Button>
        </Card>

        {/* NOTAS */}
        <Card className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Notas sobre o orçamento..."
              {...register("notes")}
            />
          </div>
        </Card>

        {/* RESUMO */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-3">
            Resumo
          </h2>
          <div>
            <p className="text-muted-foreground text-sm">Total do Orçamento</p>
            <p className="text-lg font-semibold">{formatMoeda(totalQuote)}</p>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/orcamentos")}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar Orçamento
          </Button>
        </div>
      </form>

      <ClienteModal
        open={clienteModalOpen}
        onClose={() => setClienteModalOpen(false)}
        onSuccess={() => {
          refreshClientes();
          setClienteModalOpen(false);
        }}
      />
    </div>
  );
}

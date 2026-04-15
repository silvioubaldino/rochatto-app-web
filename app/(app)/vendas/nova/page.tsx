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
import type { StatusVenda, Cliente, Produto, Fornecedor } from "@/lib/types";
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
import { STATUS_LABELS } from "@/lib/formatters";

const ALL_STATUSES: StatusVenda[] = [
  "A_ENTREGAR",
  "A_ENTREGAR_DATA",
  "A_RETIRAR",
  "ENTREGUE_PARCIAL",
  "ENTREGUE",
];

const itemSchema = z.object({
  produto_id: z.string().optional(),
  produto_nome: z.string().min(1, "Produto é obrigatório"),
  fornecedor_id: z.string().optional(),
  fornecedor_nome: z.string().optional(),
  quantidade: z.number().min(0.01, "Quantidade deve ser maior que 0"),
  preco_venda_unit: z.number().min(0, "Preço inválido"),
  custo_unit: z.number().min(0, "Custo inválido"),
});

const vendaSchema = z
  .object({
    cliente_id: z.string().min(1, "Cliente é obrigatório"),
    data_venda: z.string().min(1, "Data é obrigatória"),
    status: z.enum([
      "A_ENTREGAR",
      "A_ENTREGAR_DATA",
      "A_RETIRAR",
      "ENTREGUE_PARCIAL",
      "ENTREGUE",
    ]),
    data_entrega_prevista: z.string().optional(),
    vendedor_externo_id: z.string().optional(),
    frete_valor: z.number().min(0),
    frete_pago: z.number().min(0),
    comissao_valor: z.number().min(0),
    observacoes: z.string().optional(),
    itens: z.array(itemSchema).min(1, "Adicione pelo menos um item"),
  })
  .refine(
    (data) => {
      if (data.status === "A_ENTREGAR_DATA") {
        return !!data.data_entrega_prevista;
      }
      return true;
    },
    {
      message: "Data de entrega é obrigatória para este status",
      path: ["data_entrega_prevista"],
    },
  );

type VendaFormData = z.infer<typeof vendaSchema>;

// Autocomplete dropdown component
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

export default function NovaVendaPage() {
  const router = useRouter();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<VendaFormData>({
    resolver: zodResolver(vendaSchema),
    defaultValues: {
      cliente_id: "",
      data_venda: format(new Date(), "yyyy-MM-dd"),
      status: "A_ENTREGAR",
      data_entrega_prevista: "",
      vendedor_externo_id: "",
      frete_valor: 0,
      frete_pago: 0,
      comissao_valor: 0,
      observacoes: "",
      itens: [
        {
          produto_id: "",
          produto_nome: "",
          fornecedor_id: "",
          fornecedor_nome: "",
          quantidade: 0,
          preco_venda_unit: 0,
          custo_unit: 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "itens" });

  const watchStatus = watch("status");
  const watchVendedorId = watch("vendedor_externo_id");
  const watchItens = watch("itens");
  const watchFrete = watch("frete_valor");
  const watchComissao = watch("comissao_valor");

  // Autocomplete states
  const [clienteSearch, setClienteSearch] = useState("");
  const [debouncedClienteSearch, setDebouncedClienteSearch] = useState("");
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const [selectedClienteNome, setSelectedClienteNome] = useState("");
  const [clienteModalOpen, setClienteModalOpen] = useState(false);

  const [produtoSearches, setProdutoSearches] = useState<Record<number, string>>({});
  const [showProdutoDropdown, setShowProdutoDropdown] = useState<Record<number, boolean>>({});

  const [fornecedorSearches, setFornecedorSearches] = useState<Record<number, string>>({});
  const [showFornecedorDropdown, setShowFornecedorDropdown] = useState<Record<number, boolean>>({});

  // Debounce client search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedClienteSearch(clienteSearch), 300);
    return () => clearTimeout(timer);
  }, [clienteSearch]);

  const { clientes, refresh: refreshClientes } = useClientes(debouncedClienteSearch || undefined);
  const { produtos } = useProdutos();
  const { fornecedores } = useFornecedores();
  const { vendedoresExternos } = useVendedoresExternos();

  // Filtered lists for product/supplier dropdowns
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

  // Real-time calculations
  const totals = useMemo(() => {
    const totalVenda = (watchItens || []).reduce(
      (acc, item) => acc + (item.quantidade || 0) * (item.preco_venda_unit || 0),
      0,
    );
    const totalCusto = (watchItens || []).reduce(
      (acc, item) => acc + (item.quantidade || 0) * (item.custo_unit || 0),
      0,
    );
    const lucro = totalVenda - totalCusto - (watchFrete || 0) - (watchComissao || 0);
    const margem = totalVenda > 0 ? (lucro / totalVenda) * 100 : 0;
    return { totalVenda, totalCusto, lucro, margem };
  }, [watchItens, watchFrete, watchComissao]);

  function handleSelectCliente(cliente: Cliente) {
    setValue("cliente_id", cliente.id);
    setSelectedClienteNome(cliente.nome);
    setClienteSearch("");
    setShowClienteDropdown(false);
  }

  function handleSelectProduto(index: number, produto: Produto) {
    setValue(`itens.${index}.produto_id`, produto.id);
    setValue(`itens.${index}.produto_nome`, produto.nome);
    if (produto.preco_referencia) setValue(`itens.${index}.preco_venda_unit`, produto.preco_referencia);
    if (produto.custo_referencia) setValue(`itens.${index}.custo_unit`, produto.custo_referencia);
    setProdutoSearches((prev) => ({ ...prev, [index]: "" }));
    setShowProdutoDropdown((prev) => ({ ...prev, [index]: false }));
  }

  function handleSelectFornecedor(index: number, fornecedor: Fornecedor) {
    setValue(`itens.${index}.fornecedor_id`, fornecedor.id);
    setValue(`itens.${index}.fornecedor_nome`, fornecedor.nome);
    setFornecedorSearches((prev) => ({ ...prev, [index]: "" }));
    setShowFornecedorDropdown((prev) => ({ ...prev, [index]: false }));
  }

  function addItem() {
    append({
      produto_id: "",
      produto_nome: "",
      fornecedor_id: "",
      fornecedor_nome: "",
      quantidade: 0,
      preco_venda_unit: 0,
      custo_unit: 0,
    });
  }

  async function onSubmit(data: VendaFormData) {
    try {
      const payload = {
        ...data,
        vendedor_externo_id: data.vendedor_externo_id || undefined,
        data_entrega_prevista: data.data_entrega_prevista || undefined,
        observacoes: data.observacoes || undefined,
      };
      const created = await api.post<{ id: string }>("/vendas", payload);
      toast.success("Venda criada com sucesso!");
      router.push(`/vendas/${created.id}`);
    } catch (err) {
      const message = err instanceof APIError ? err.message : "Erro ao criar venda.";
      toast.error(message);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/vendas")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Nova Venda</h1>
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
                      setValue("cliente_id", "");
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
              <input type="hidden" {...register("cliente_id")} />
              {errors.cliente_id && (
                <p className="text-xs text-destructive">{errors.cliente_id.message}</p>
              )}
            </div>

            {/* Data */}
            <div className="space-y-2">
              <Label htmlFor="data_venda">Data *</Label>
              <Input id="data_venda" type="date" {...register("data_venda")} />
              {errors.data_venda && (
                <p className="text-xs text-destructive">{errors.data_venda.message}</p>
              )}
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <select
                id="status"
                {...register("status")}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>

            {/* Data Entrega (conditional) */}
            {watchStatus === "A_ENTREGAR_DATA" && (
              <div className="space-y-2">
                <Label htmlFor="data_entrega_prevista">Data de Entrega *</Label>
                <Input
                  id="data_entrega_prevista"
                  type="date"
                  {...register("data_entrega_prevista")}
                />
                {errors.data_entrega_prevista && (
                  <p className="text-xs text-destructive">
                    {errors.data_entrega_prevista.message}
                  </p>
                )}
              </div>
            )}

            {/* Vendedor Externo */}
            <div className="space-y-2">
              <Label htmlFor="vendedor_externo_id">Vendedor Externo</Label>
              <select
                id="vendedor_externo_id"
                {...register("vendedor_externo_id")}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Nenhum</option>
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
            Itens da Venda
          </h2>

          {/* Header for desktop */}
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
                      : watchItens?.[index]?.produto_nome || ""
                  }
                  onChange={(e) => {
                    setProdutoSearches((prev) => ({ ...prev, [index]: e.target.value }));
                    setValue(`itens.${index}.produto_nome`, e.target.value);
                    setValue(`itens.${index}.produto_id`, "");
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
                {errors.itens?.[index]?.produto_nome && (
                  <p className="text-xs text-destructive">
                    {errors.itens[index].produto_nome?.message}
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
                      : watchItens?.[index]?.fornecedor_nome || ""
                  }
                  onChange={(e) => {
                    setFornecedorSearches((prev) => ({ ...prev, [index]: e.target.value }));
                    setValue(`itens.${index}.fornecedor_nome`, e.target.value);
                    setValue(`itens.${index}.fornecedor_id`, "");
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
                  name={`itens.${index}.quantidade`}
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
                {errors.itens?.[index]?.quantidade && (
                  <p className="text-xs text-destructive">
                    {errors.itens[index].quantidade?.message}
                  </p>
                )}
              </div>

              {/* Preço Venda */}
              <div>
                <label className="text-xs text-muted-foreground sm:hidden">Preço Venda</label>
                <Controller
                  control={control}
                  name={`itens.${index}.preco_venda_unit`}
                  render={({ field: f }) => (
                    <MoneyInput
                      value={f.value}
                      onChange={f.onChange}
                      className="h-8 text-sm"
                    />
                  )}
                />
              </div>

              {/* Custo */}
              <div>
                <label className="text-xs text-muted-foreground sm:hidden">Custo</label>
                <Controller
                  control={control}
                  name={`itens.${index}.custo_unit`}
                  render={({ field: f }) => (
                    <MoneyInput
                      value={f.value}
                      onChange={f.onChange}
                      className="h-8 text-sm"
                    />
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

          {errors.itens?.root && (
            <p className="text-xs text-destructive">{errors.itens.root.message}</p>
          )}

          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-3.5 w-3.5" />
            Adicionar Produto
          </Button>
        </Card>

        {/* LOGÍSTICA E COMISSÃO */}
        <Card className="p-4 space-y-4">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">
            Logística e Comissão
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Frete Valor</Label>
              <Controller
                control={control}
                name="frete_valor"
                render={({ field: f }) => (
                  <MoneyInput value={f.value} onChange={f.onChange} />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Frete Pago</Label>
              <Controller
                control={control}
                name="frete_pago"
                render={({ field: f }) => (
                  <MoneyInput value={f.value} onChange={f.onChange} />
                )}
              />
            </div>

            {watchVendedorId && (
              <div className="space-y-2">
                <Label>Comissão</Label>
                <Controller
                  control={control}
                  name="comissao_valor"
                  render={({ field: f }) => (
                    <MoneyInput value={f.value} onChange={f.onChange} />
                  )}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              placeholder="Notas sobre a venda..."
              {...register("observacoes")}
            />
          </div>
        </Card>

        {/* RESUMO */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-3">
            Resumo
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Venda</p>
              <p className="text-lg font-semibold">{formatMoeda(totals.totalVenda)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Custo</p>
              <p className="text-lg font-semibold">{formatMoeda(totals.totalCusto)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Lucro</p>
              <p
                className={`text-lg font-semibold ${totals.lucro < 0 ? "text-destructive" : "text-green-600"}`}
              >
                {formatMoeda(totals.lucro)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Margem</p>
              <p className="text-lg font-semibold">{totals.margem.toFixed(1)}%</p>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/vendas")}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar Venda
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

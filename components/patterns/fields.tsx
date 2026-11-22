"use client";

import { useId, useRef, useState, type ReactNode, type Ref } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { addDaysISO, formatMoney, moneyToInput, parseMoney, parseQuantity, todayISO } from "@/lib/format";

interface FieldShellProps {
  label: ReactNode;
  htmlFor?: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

export function FieldShell({ label, htmlFor, error, hint, required, className, children }: FieldShellProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span aria-hidden> *</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

interface BaseFieldProps {
  id?: string;
  name?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  onBlur?: () => void;
  ref?: Ref<HTMLInputElement>;
  enterKeyHint?: "next" | "done" | "send" | "go";
  autoFocus?: boolean;
  placeholder?: string;
}

export interface MoneyFieldProps extends BaseFieldProps {
  value: number | null | undefined;
  onChange: (value: number) => void;
}

export function MoneyField({ value, onChange, invalid, enterKeyHint = "next", className, ...rest }: MoneyFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const typed = useRef(false);
  return (
    <Input
      {...rest}
      type="text"
      inputMode="decimal"
      enterKeyHint={enterKeyHint}
      autoComplete="off"
      aria-invalid={invalid || undefined}
      className={cn("tabular-nums", className)}
      value={draft ?? formatMoney(value)}
      onFocus={(e) => {
        typed.current = false;
        setDraft(moneyToInput(value));
        // Seleciona para digitar por cima — só se o dono ainda não digitou (senão apaga o início).
        requestAnimationFrame(() => {
          if (!typed.current) e.target.select?.();
        });
      }}
      onChange={(e) => {
        const v = e.target.value;
        if (/^-?[0-9.,]*$/.test(v)) {
          typed.current = true;
          setDraft(v);
        }
      }}
      onBlur={() => {
        if (draft !== null) onChange(parseMoney(draft) ?? 0);
        setDraft(null);
        rest.onBlur?.();
      }}
    />
  );
}

export interface QuantityFieldProps extends BaseFieldProps {
  value: number | null | undefined;
  onChange: (value: number) => void;
  unit?: string | null;
}

export function QuantityField({
  value,
  onChange,
  unit,
  invalid,
  enterKeyHint = "next",
  className,
  ...rest
}: QuantityFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value ? String(value).replace(".", ",") : "");
  return (
    <div className="relative">
      <Input
        {...rest}
        type="text"
        inputMode="decimal"
        enterKeyHint={enterKeyHint}
        autoComplete="off"
        aria-invalid={invalid || undefined}
        className={cn("tabular-nums", unit && "pr-12", className)}
        value={shown}
        onChange={(e) => {
          if (/^[0-9.,]*$/.test(e.target.value)) setDraft(e.target.value);
        }}
        onBlur={() => {
          if (draft !== null) onChange(parseQuantity(draft) ?? 0);
          setDraft(null);
          rest.onBlur?.();
        }}
      />
      {unit && (
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
          {unit}
        </span>
      )}
    </div>
  );
}

export interface DateFieldProps extends BaseFieldProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  shortcuts?: boolean;
  today?: string;
}

export function DateField({
  value,
  onChange,
  invalid,
  shortcuts = true,
  today,
  enterKeyHint = "next",
  className,
  ...rest
}: DateFieldProps) {
  const autoId = useId();
  const base = today ?? todayISO();
  const options = [
    { label: "Hoje", value: base },
    { label: "+7 dias", value: addDaysISO(base, 7) },
    { label: "+30 dias", value: addDaysISO(base, 30) },
  ];
  return (
    <div className="space-y-1.5">
      <Input
        id={rest.id ?? autoId}
        {...rest}
        type="date"
        enterKeyHint={enterKeyHint}
        aria-invalid={invalid || undefined}
        className={className}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
      {shortcuts && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Atalhos de data">
          {options.map((o) => (
            <Button
              key={o.label}
              type="button"
              size="xs"
              variant={value === o.value ? "default" : "outline"}
              disabled={rest.disabled}
              onClick={() => onChange(o.value)}
            >
              {o.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { formatMoeda } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface MoneyInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function MoneyInput({
  value,
  onChange,
  disabled,
  className,
  id,
}: MoneyInputProps) {
  const [focused, setFocused] = useState(false);
  const [rawValue, setRawValue] = useState("");

  const handleFocus = useCallback(() => {
    setFocused(true);
    setRawValue(value === 0 ? "" : String(value).replace(".", ","));
  }, [value]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    const parsed = parseFloat(rawValue.replace(",", "."));
    onChange(isNaN(parsed) ? 0 : parsed);
  }, [rawValue, onChange]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (/^[0-9]*[,.]?[0-9]*$/.test(val)) {
        setRawValue(val);
      }
    },
    [],
  );

  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      value={focused ? rawValue : formatMoeda(value)}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      disabled={disabled}
      className={cn(className)}
    />
  );
}

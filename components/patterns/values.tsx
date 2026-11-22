import { cn } from "@/lib/utils";
import { formatDate, formatMoney, formatQuantity, TONE_TEXT_CLASSES, type Tone } from "@/lib/format";

export function MoneyText({
  value,
  tone,
  className,
}: {
  value: number | null | undefined;
  tone?: Tone;
  className?: string;
}) {
  const negative = typeof value === "number" && value < 0;
  const resolved = tone ?? (negative ? "danger" : undefined);
  return (
    <span className={cn("tabular-nums whitespace-nowrap", resolved && TONE_TEXT_CLASSES[resolved], className)}>
      {formatMoney(value)}
    </span>
  );
}

export function QuantityText({
  value,
  unit,
  className,
}: {
  value: number | null | undefined;
  unit?: string | null;
  className?: string;
}) {
  return <span className={cn("tabular-nums whitespace-nowrap", className)}>{formatQuantity(value, unit)}</span>;
}

export function DateText({
  value,
  tone,
  className,
}: {
  value: string | null | undefined;
  tone?: Tone;
  className?: string;
}) {
  if (!value) return <span className={cn("text-muted-foreground", className)}>—</span>;
  return (
    <time dateTime={value} className={cn("tabular-nums whitespace-nowrap", tone && TONE_TEXT_CLASSES[tone], className)}>
      {formatDate(value)}
    </time>
  );
}

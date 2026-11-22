import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  statusMeta,
  TONE_SUBTLE_CLASSES,
  type StatusKind,
  type StatusMetaOptions,
  type Tone,
} from "@/lib/format";

const BASE =
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap";

type EnumProps = {
  kind: StatusKind;
  value: string | null | undefined;
  className?: string;
  title?: string;
} & StatusMetaOptions;

type ToneProps = {
  tone: Tone;
  children: ReactNode;
  className?: string;
  title?: string;
};

export type StatusBadgeProps = EnumProps | ToneProps;

export function StatusBadge(props: StatusBadgeProps) {
  if ("tone" in props) {
    return (
      <span title={props.title} className={cn(BASE, TONE_SUBTLE_CLASSES[props.tone], props.className)}>
        {props.children}
      </span>
    );
  }
  const { kind, value, className, title, serviceOnly, overdue } = props;
  const meta = statusMeta(kind, value, { serviceOnly, overdue });
  return (
    <span
      title={title}
      data-status={value ?? undefined}
      data-tone={meta.tone}
      className={cn(BASE, TONE_SUBTLE_CLASSES[meta.tone], className)}
    >
      {meta.label}
    </span>
  );
}

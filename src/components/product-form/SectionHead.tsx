"use client";

import { AlertTriangle, Info, CheckCircle2, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Tone = "navy" | "bronze" | "warn" | "success" | "error";

/** Coloured icon chip + title + optional help line. Replaces the identical
 *  10px grey `.card-title` that headed all nine cards of the old page. */
export function SectionHead({
  icon: Icon,
  tone = "navy",
  title,
  hint,
  right,
}: {
  icon: LucideIcon;
  tone?: Tone;
  title: string;
  hint?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="section-head">
      <span className={`sec-icon ${tone}`}>
        <Icon size={17} strokeWidth={1.8} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="sh-title">{title}</div>
        {hint && <div className="sh-hint">{hint}</div>}
      </div>
      {right}
    </div>
  );
}

const CALLOUT_ICON = {
  info: Info,
  warn: AlertTriangle,
  danger: XCircle,
  success: CheckCircle2,
} as const;

/** Coloured explanation box. The old page used unstyled 12px grey paragraphs
 *  for warnings, information and consequences alike. */
export function Callout({
  kind = "info",
  children,
}: {
  kind?: keyof typeof CALLOUT_ICON;
  children: React.ReactNode;
}) {
  const Icon = CALLOUT_ICON[kind];
  return (
    <div className={`callout ${kind}`}>
      <Icon size={15} strokeWidth={1.9} />
      <div>{children}</div>
    </div>
  );
}

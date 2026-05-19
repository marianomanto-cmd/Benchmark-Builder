/**
 * <AlertCard> — handoff §3.2.
 * severity high (danger) / med (warn) / low (info). Dot del color + acciones inline footer.
 */

import { cn } from "@/lib/cn";

export type Severity = "high" | "med" | "low";

const meta: Record<Severity, { label: string; dot: string; text: string }> = {
  high: { label: "Alta", dot: "bg-danger", text: "text-danger" },
  med: { label: "Media", dot: "bg-warn", text: "text-warn" },
  low: { label: "Baja", dot: "bg-info", text: "text-info" },
};

export interface AlertCardProps {
  severity: Severity;
  title: string;
  body: string;
  when: string;
  evidence?: string;
  onMarkRead?: () => void;
  onDismiss?: () => void;
  onOpen?: () => void;
  className?: string;
}

export function AlertCard({
  severity,
  title,
  body,
  when,
  evidence,
  onMarkRead,
  onDismiss,
  onOpen,
  className,
}: AlertCardProps) {
  const m = meta[severity];
  return (
    <article className={cn("bg-white border border-n-200 rounded-md p-3.5", className)}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={cn("size-2 rounded-full", m.dot)} />
        <span className={cn("text-[11px] font-semibold uppercase tracking-[0.08em]", m.text)}>
          {m.label}
        </span>
        <span className="t-mono text-[11px] text-n-500 ml-auto">{when}</span>
      </div>
      <h3 className="t-h3 text-n-900 mb-1">{title}</h3>
      <p className="t-small text-n-600 mb-2">{body}</p>
      {evidence && (
        <div className="t-mono text-[11px] text-n-500 bg-n-50 rounded-sm px-2 py-1 mb-3">{evidence}</div>
      )}
      <div className="flex gap-3 text-[12px] font-medium">
        {onOpen && (
          <button onClick={onOpen} className="text-n-900 hover:underline">
            Abrir
          </button>
        )}
        {onMarkRead && (
          <button onClick={onMarkRead} className="text-n-500 hover:text-n-900">
            Marcar leída
          </button>
        )}
        {onDismiss && (
          <button onClick={onDismiss} className="text-n-500 hover:text-n-900 ml-auto">
            Descartar
          </button>
        )}
      </div>
    </article>
  );
}

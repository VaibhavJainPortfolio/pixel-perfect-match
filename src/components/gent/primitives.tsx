import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border border-border bg-card p-5 text-card-foreground", className)} {...props} />;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  as: Tag = "h2",
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center";
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", align === "center" && "mx-auto max-w-xl text-center", className)}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <Tag className={cn("text-foreground", Tag === "h1" ? "text-4xl leading-tight sm:text-5xl" : "text-3xl leading-tight")}>
        {title}
      </Tag>
      {description && <p className="text-base leading-relaxed text-muted-foreground">{description}</p>}
    </div>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <Card className="space-y-1 p-4">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="font-display text-3xl text-foreground">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

type Tone = "neutral" | "gold" | "success" | "error";
const toneClass: Record<Tone, string> = {
  neutral: "border-border text-muted-foreground",
  gold: "border-gold/40 bg-gold-soft text-gold",
  success: "border-success/40 text-success",
  error: "border-destructive/40 text-destructive",
};

const statusTone: Record<string, Tone> = {
  delivered: "success", completed: "success", passed: "success", approved: "success", succeeded: "success", paid: "success",
  failed: "error", refunded: "error", cancelled: "error", changes_requested: "error",
  processing: "gold", running: "gold", review: "gold", waiting_review: "gold", in_progress: "gold", intake: "gold",
};

export function StatusBadge({ status, tone, className }: { status: string; tone?: Tone; className?: string }) {
  const t = tone ?? statusTone[status] ?? "neutral";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize", toneClass[t], className)}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-12 text-center">
      {icon && <div className="text-gold [&_svg]:size-7">{icon}</div>}
      <h3 className="text-xl text-foreground">{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

export function ImageWithLabel({
  src,
  alt,
  label,
  sublabel,
  ratio = "aspect-[3/4]",
}: {
  src: string;
  alt: string;
  label: string;
  sublabel?: string;
  ratio?: string;
}) {
  return (
    <figure className="overflow-hidden rounded-lg border border-border bg-card">
      <div className={cn("overflow-hidden", ratio)}>
        <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />
      </div>
      <figcaption className="space-y-0.5 border-t border-border px-3 py-2.5">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
      </figcaption>
    </figure>
  );
}

/** Tape-measure style progress bar. */
export function StepProgress({ steps, current }: { steps: string[]; current: number }) {
  const pct = steps.length > 1 ? (current / (steps.length - 1)) * 100 : 100;
  return (
    <div className="space-y-2" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={current + 1}>
      <div className="relative h-7 overflow-hidden rounded-md border border-border bg-card tape-ticks">
        <div className="absolute inset-y-0 left-0 border-r-2 border-gold bg-gold-soft transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[11px] font-semibold uppercase tracking-wider">
        {steps.map((s, i) => (
          <span key={s} className={i <= current ? "text-gold" : "text-muted-foreground"}>
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

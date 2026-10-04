import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getOrderProgress } from "@/lib/pipeline.functions";
import { cn } from "@/lib/utils";

export type Progress = Awaited<ReturnType<typeof getOrderProgress>>;

/** Live progress for one order: polls every 20s and refreshes on run updates. */
export function useOrderProgress(orderId: string) {
  const progressFn = useServerFn(getOrderProgress);
  const [p, setP] = useState<Progress | null>(null);
  const refresh = useCallback(() => { progressFn({ data: { orderId } }).then(setP).catch(() => {}); }, [orderId]);
  useEffect(() => { refresh(); const t = setInterval(refresh, 20000); return () => clearInterval(t); }, [refresh]);
  useEffect(() => {
    if (!p?.runId) return;
    const ch = supabase.channel(`run-${p.runId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "pipeline_runs", filter: `id=eq.${p.runId}` }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [p?.runId, refresh]);
  return p;
}

export function ProgressLines({ lines }: { lines: Progress["lines"] }) {
  return (
    <div className="divide-y divide-border rounded-xl border border-border bg-card">
      {lines.map((l) => (
        <div key={l.label} className="flex items-center gap-3 px-5 py-4">
          <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
            l.state === "done" ? "border-success bg-success/15 text-success" : l.state === "active" ? "border-gold text-gold" : "border-border text-muted-foreground")}>
            {l.state === "done" ? <Check className="h-3.5 w-3.5" /> : l.state === "active" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          </span>
          <span className={cn("text-sm", l.state === "pending" ? "text-muted-foreground" : "text-foreground")}>{l.label}</span>
        </div>
      ))}
    </div>
  );
}

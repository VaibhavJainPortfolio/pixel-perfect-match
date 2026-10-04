import { createFileRoute } from "@tanstack/react-router";

// Called hourly by the scheduler. Queues one WhatsApp reminder per abandoned/failed order older than 1 hour.
export const Route = createFileRoute("/api/public/cron/payment-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["LOVABLE_CRON_SECRET"];
        const { safeEqual } = await import("@/lib/payments.server");
        const got = request.headers.get("x-cron-secret") ?? "";
        if (!secret || !safeEqual(got, secret)) return new Response("Unauthorized", { status: 401 });
        const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
        const cutoff = new Date(Date.now() - 3600_000).toISOString();
        const since = new Date(Date.now() - 48 * 3600_000).toISOString();
        const { data: orders } = await admin.from("orders").select("id, user_id, product")
          .in("status", ["created", "failed"]).is("reminder_sent_at", null).lt("created_at", cutoff).gt("created_at", since).limit(200);
        let queued = 0;
        for (const o of orders ?? []) {
          // Skip if the user has since paid for another order
          const { count } = await admin.from("orders").select("id", { count: "exact", head: true }).eq("user_id", o.user_id).neq("status", "created").neq("status", "failed").neq("status", "cancelled").gt("created_at", since);
          const { data: p } = await admin.from("profiles").select("whatsapp_opt_in, phone, full_name, status").eq("id", o.user_id).maybeSingle();
          await admin.from("orders").update({ reminder_sent_at: new Date().toISOString() }).eq("id", o.id);
          if (count || !p?.whatsapp_opt_in || !p.phone || p.status !== "active") continue;
          await admin.from("notifications").insert({
            user_id: o.user_id, order_id: o.id, channel: "whatsapp", template: "payment_reminder", status: "queued",
            payload: { name: p.full_name, phone: p.phone, product: o.product },
          });
          queued++;
        }
        return Response.json({ queued });
      },
    },
  },
});

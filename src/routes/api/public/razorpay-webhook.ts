import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/razorpay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["RAZORPAY_WEBHOOK_SECRET"];
        if (!secret) return new Response("Not configured", { status: 503 });
        const body = await request.text();
        const sig = request.headers.get("x-razorpay-signature") ?? "";
        const { hmacHex, safeEqual, markOrderPaid } = await import("@/lib/payments.server");
        if (!safeEqual(hmacHex(secret, body), sig)) return new Response("Invalid signature", { status: 401 });

        const evt = JSON.parse(body);
        const eventId = request.headers.get("x-razorpay-event-id") ?? `${evt.event}:${evt.payload?.payment?.entity?.id ?? evt.payload?.refund?.entity?.id}`;
        const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
        const { error: dup } = await admin.from("payment_events").insert({ event_id: eventId, event_type: evt.event, payload: evt });
        if (dup) return new Response("ok"); // already processed

        const pay = evt.payload?.payment?.entity;
        const findOrder = async (rzOrderId?: string) => {
          if (!rzOrderId) return null;
          const { data } = await admin.from("orders").select("id, status").eq("razorpay_order_id", rzOrderId).maybeSingle();
          return data;
        };
        try {
          if (evt.event === "payment.captured") {
            const o = await findOrder(pay?.order_id);
            if (o) await markOrderPaid(admin, o.id, pay.id);
          } else if (evt.event === "payment.failed") {
            const o = await findOrder(pay?.order_id);
            if (o) await admin.from("orders").update({ status: "failed", failure_reason: pay?.error_description ?? "Payment failed" }).eq("id", o.id).eq("status", "created");
          } else if (evt.event === "refund.processed") {
            const paymentId = evt.payload?.refund?.entity?.payment_id;
            if (paymentId) await admin.from("orders").update({ status: "refunded" }).eq("razorpay_payment_id", paymentId);
          }
        } catch (e) {
          await admin.from("payment_events").delete().eq("event_id", eventId); // let Razorpay retry
          console.error(e);
          return new Response("error", { status: 500 });
        }
        return new Response("ok");
      },
    },
  },
});

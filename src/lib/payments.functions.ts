import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const productSchema = z.enum(["style_report", "style_report_plus", "occasion_pack"]);

export const getQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ product: productSchema, coupon: z.string().max(40).optional().nullable() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { buildQuote } = await import("./payments.server");
    return buildQuote(supabaseAdmin, data.product, data.coupon);
  });

export const createRazorpayOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    product: productSchema, coupon: z.string().max(40).optional().nullable(),
    state: z.string().min(2).max(60), retryOrderId: z.string().uuid().optional().nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { buildQuote, razorpayFetch } = await import("./payments.server");
    const q = await buildQuote(admin, data.product, data.coupon);
    if (data.coupon && q.coupon_error) throw new Error(q.coupon_error);
    await admin.from("profiles").update({ state: data.state }).eq("id", context.userId);

    const { data: order, error } = await admin.from("orders").insert({
      user_id: context.userId, product: q.product as any, status: "created",
      amount_paise: q.taxable_paise, discount_paise: q.discount_paise, gst_paise: q.gst_paise, total_paise: q.total_paise,
      coupon_code: q.coupon_code, customer_state: data.state,
    }).select("id").single();
    if (error) throw new Error(error.message);
    if (data.retryOrderId) {
      await admin.from("orders").update({ status: "cancelled" }).eq("id", data.retryOrderId).eq("user_id", context.userId).in("status", ["created", "failed"]);
    }
    const rz = await razorpayFetch("/orders", { method: "POST", body: { amount: q.total_paise, currency: "INR", receipt: order.id, notes: { order_id: order.id, user_id: context.userId } } });
    await admin.from("orders").update({ razorpay_order_id: rz.id }).eq("id", order.id);
    const { data: p } = await admin.from("profiles").select("full_name, email, phone").eq("id", context.userId).maybeSingle();
    return {
      orderId: order.id, razorpayOrderId: rz.id as string, keyId: process.env["RAZORPAY_KEY_ID"]!,
      amount: q.total_paise, name: p?.full_name ?? "", email: p?.email ?? "", phone: p?.phone ?? "",
    };
  });

export const verifyRazorpayPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    orderId: z.string().uuid(), razorpay_order_id: z.string().max(64),
    razorpay_payment_id: z.string().max(64), razorpay_signature: z.string().max(256),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { hmacHex, safeEqual, markOrderPaid } = await import("./payments.server");
    const { data: o } = await admin.from("orders").select("id, user_id, razorpay_order_id").eq("id", data.orderId).maybeSingle();
    if (!o || o.user_id !== context.userId || o.razorpay_order_id !== data.razorpay_order_id) throw new Error("Order not found");
    const expected = hmacHex(process.env["RAZORPAY_KEY_SECRET"]!, `${data.razorpay_order_id}|${data.razorpay_payment_id}`);
    if (!safeEqual(expected, data.razorpay_signature)) throw new Error("Payment could not be verified");
    await markOrderPaid(admin, o.id, data.razorpay_payment_id);
    return { orderId: o.id };
  });

export const markPaymentFailed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().uuid(), reason: z.string().max(300).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    await admin.from("orders").update({ status: "failed", failure_reason: data.reason ?? "Payment not completed" })
      .eq("id", data.orderId).eq("user_id", context.userId).eq("status", "created");
    return { ok: true };
  });

export const getInvoiceLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: o } = await context.supabase.from("orders").select("invoice_url").eq("id", data.orderId).maybeSingle();
    if (!o?.invoice_url) return { url: null };
    const { data: s } = await context.supabase.storage.from("invoices").createSignedUrl(o.invoice_url, 600);
    return { url: s?.signedUrl ?? null };
  });

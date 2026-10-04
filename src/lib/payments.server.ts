import { createHmac, timingSafeEqual } from "crypto";

type Admin = any;

export const HOME_STATE = "Madhya Pradesh";

export function hmacHex(secret: string, body: string) {
  return createHmac("sha256", secret).update(body).digest("hex");
}
export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export type Quote = {
  product: string; name: string; features: string[];
  amount_paise: number; discount_paise: number; taxable_paise: number;
  gst_rate: number; gst_paise: number; total_paise: number;
  coupon_code: string | null; coupon_error: string | null;
};

/** Server-side price calculation. Never trusts client amounts. */
export async function buildQuote(admin: Admin, product: string, couponCode?: string | null): Promise<Quote> {
  const { data: p, error } = await admin.from("pricing").select("product, name, features, amount_paise, gst_rate")
    .eq("product", product).eq("active", true).maybeSingle();
  if (error || !p) throw new Error("This product isn't available.");
  let discount = 0, code: string | null = null, couponError: string | null = null;
  const c = couponCode?.trim().toUpperCase();
  if (c) {
    const { data: cp } = await admin.from("coupons").select("*").eq("code", c).maybeSingle();
    const now = Date.now();
    if (!cp || !cp.active) couponError = "This code isn't valid.";
    else if (cp.valid_from && new Date(cp.valid_from).getTime() > now) couponError = "This code isn't active yet.";
    else if (cp.valid_to && new Date(cp.valid_to).getTime() < now) couponError = "This code has expired.";
    else if (cp.max_uses != null && cp.used_count >= cp.max_uses) couponError = "This code has been fully used.";
    else {
      // percent: value = % off; flat: value = paise off
      discount = cp.discount_type === "percent" ? Math.round((p.amount_paise * Math.min(cp.value, 100)) / 100) : cp.value;
      discount = Math.min(Math.max(discount, 0), p.amount_paise - 100); // keep at least ₹1
      code = cp.code;
    }
  }
  const taxable = p.amount_paise - discount;
  const rate = Number(p.gst_rate);
  const gst = Math.round((taxable * rate) / 100);
  return {
    product: p.product, name: p.name, features: p.features ?? [],
    amount_paise: p.amount_paise, discount_paise: discount, taxable_paise: taxable,
    gst_rate: rate, gst_paise: gst, total_paise: taxable + gst,
    coupon_code: code, coupon_error: couponError,
  };
}

export async function razorpayFetch(path: string, init: { method: string; body?: unknown }) {
  const id = process.env["RAZORPAY_KEY_ID"], secret = process.env["RAZORPAY_KEY_SECRET"];
  if (!id || !secret) throw new Error("Payments aren't set up yet.");
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: init.method,
    headers: { "content-type": "application/json", authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64") },
    body: init.body ? JSON.stringify(init.body) : null,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.description ?? "Razorpay request failed");
  return json;
}

/** Idempotent: safe to call from both the browser callback and the webhook. */
export async function markOrderPaid(admin: Admin, orderId: string, paymentId: string) {
  const { data: updated } = await admin.from("orders")
    .update({ status: "paid", paid_at: new Date().toISOString(), razorpay_payment_id: paymentId, failure_reason: null })
    .eq("id", orderId).in("status", ["created", "failed"]).select("id, user_id, coupon_code").maybeSingle();
  if (updated) {
    if (updated.coupon_code) await admin.rpc("increment_coupon_use", { _code: updated.coupon_code });
    await admin.from("submissions").upsert({ order_id: orderId, user_id: updated.user_id, basics: {}, status: "draft" }, { onConflict: "order_id", ignoreDuplicates: true });
    await admin.from("audit_log").insert({ actor_id: updated.user_id, action: "order_paid", entity: "order", entity_id: orderId, after: { payment_id: paymentId } });
    try { await generateInvoice(admin, orderId); } catch (e) { console.error("invoice failed", e); }
  }
  return !!updated;
}

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const rs = (p: number) => "₹" + (p / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function financialYear(d: Date) {
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
}

export async function generateInvoice(admin: Admin, orderId: string) {
  const { data: o } = await admin.from("orders").select("*").eq("id", orderId).single();
  if (!o || o.status === "created") throw new Error("Order not paid");
  const [{ data: seller }, { data: prof }, { data: price }] = await Promise.all([
    admin.from("business_settings").select("*").eq("id", 1).single(),
    admin.from("profiles").select("full_name, email, phone, state").eq("id", o.user_id).maybeSingle(),
    admin.from("pricing").select("name").eq("product", o.product).maybeSingle(),
  ]);
  let number = o.invoice_number as string | null;
  if (!number) {
    const { data: n, error } = await admin.rpc("next_invoice_number", { _fy: financialYear(new Date(o.paid_at ?? Date.now())) });
    if (error) throw error;
    number = n as string;
    await admin.from("orders").update({ invoice_number: number }).eq("id", orderId);
  }
  const custState = o.customer_state ?? prof?.state ?? "";
  const intra = custState.trim().toLowerCase() === (seller?.state ?? HOME_STATE).toLowerCase();
  const taxable = o.amount_paise, gst = o.gst_paise;
  const half = Math.floor(gst / 2);
  const taxRows = intra
    ? `<tr><td>CGST 9%</td><td class="r">${rs(half)}</td></tr><tr><td>SGST 9%</td><td class="r">${rs(gst - half)}</td></tr>`
    : `<tr><td>IGST 18%</td><td class="r">${rs(gst)}</td></tr>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
body{font-family:Helvetica,Arial,sans-serif;color:#121726;padding:32px;font-size:13px}
h1{font-size:22px;margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:16px}
td,th{border-bottom:1px solid #ddd;padding:8px;text-align:left}.r{text-align:right}.muted{color:#666}
.grid{display:flex;justify-content:space-between;gap:24px;margin-top:24px}
</style></head><body>
<h1>Tax Invoice</h1><div class="muted">Invoice ${esc(number)} · ${new Date(o.paid_at ?? Date.now()).toLocaleDateString("en-IN")}</div>
<div class="grid"><div><strong>${esc(seller?.legal_name)}</strong><br>${esc(seller?.address)}<br>GSTIN: ${esc(seller?.gstin)}<br>State: ${esc(seller?.state)} (${esc(seller?.state_code)})</div>
<div><strong>Billed to</strong><br>${esc(prof?.full_name)}<br>${esc(prof?.email)}<br>${esc(prof?.phone)}<br>State: ${esc(custState)}</div></div>
<table><tr><th>Description</th><th>SAC</th><th class="r">Amount</th></tr>
<tr><td>${esc(price?.name ?? o.product)}</td><td>${esc(seller?.sac_code ?? "998311")}</td><td class="r">${rs(taxable + (o.discount_paise ?? 0))}</td></tr>
${o.discount_paise ? `<tr><td>Discount${o.coupon_code ? " (" + esc(o.coupon_code) + ")" : ""}</td><td></td><td class="r">-${rs(o.discount_paise)}</td></tr>` : ""}
<tr><td><strong>Taxable value</strong></td><td></td><td class="r">${rs(taxable)}</td></tr></table>
<table>${taxRows}<tr><td><strong>Total</strong></td><td class="r"><strong>${rs(o.total_paise)}</strong></td></tr></table>
<p class="muted">Payment ID: ${esc(o.razorpay_payment_id)}</p></body></html>`;

  const key = process.env["PDFSHIFT_API_KEY"];
  if (!key) throw new Error("PDF service not set up");
  const res = await fetch("https://api.pdfshift.io/v3/convert/pdf", {
    method: "POST", headers: { "content-type": "application/json", "X-API-Key": key },
    body: JSON.stringify({ source: html, format: "A4" }),
  });
  if (!res.ok) throw new Error("PDF conversion failed: " + (await res.text()));
  const pdf = new Uint8Array(await res.arrayBuffer());
  const path = `${o.user_id}/${number.replace(/\//g, "-")}.pdf`;
  const up = await admin.storage.from("invoices").upload(path, pdf, { contentType: "application/pdf", upsert: true });
  if (up.error) throw up.error;
  await admin.from("orders").update({ invoice_url: path }).eq("id", orderId);
  return { number, path };
}

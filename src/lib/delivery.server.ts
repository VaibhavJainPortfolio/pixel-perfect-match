// Report delivery senders. Each returns a result instead of throwing so one failed channel never blocks another.
type SendResult = { status: "sent" | "failed" | "skipped"; detail?: string; providerId?: string };

/** WhatsApp approved template with the PDF as a document header and a URL button (dynamic suffix = report id). */
export async function sendWhatsApp(opts: {
  provider: string; phone: string; name: string; pdfUrl: string | null; reportId: string; template: string; language: string;
}): Promise<SendResult> {
  if (opts.provider !== "meta" && opts.provider !== "whatsapp_cloud") return { status: "skipped", detail: `Provider "${opts.provider}" is not built yet` };
  const token = process.env["WHATSAPP_TOKEN"], phoneId = process.env["WHATSAPP_PHONE_NUMBER_ID"];
  if (!token || !phoneId) return { status: "skipped", detail: "WhatsApp is not set up" };
  const to = opts.phone.replace(/[^\d]/g, "");
  const components: any[] = [{ type: "body", parameters: [{ type: "text", text: opts.name || "there" }] },
    { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: opts.reportId }] }];
  if (opts.pdfUrl) components.unshift({ type: "header", parameters: [{ type: "document", document: { link: opts.pdfUrl, filename: "TheGent-Style-Report.pdf" } }] });
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to, type: "template", template: { name: opts.template, language: { code: opts.language }, components } }),
    });
    const j: any = await res.json().catch(() => ({}));
    if (!res.ok) return { status: "failed", detail: String(j?.error?.message ?? res.status).slice(0, 300) };
    return { status: "sent", providerId: j?.messages?.[0]?.id };
  } catch (e: any) { return { status: "failed", detail: String(e?.message ?? e).slice(0, 300) }; }
}

export async function sendReportEmail(opts: {
  to: string; from: string; name: string; reportUrl: string; invoiceUrl: string | null; pdf: Uint8Array | null; reference: string;
}): Promise<SendResult> {
  const key = process.env["RESEND_API_KEY"];
  if (!key) return { status: "skipped", detail: "Email is not set up" };
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
  // Email clients don't support CSS variables, so brand colours are literal here.
  const html = `<!doctype html><html><body style="margin:0;background:#121726;font-family:Arial,Helvetica,sans-serif;color:#EEE8DC">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#121726;padding:32px 12px"><tr><td align="center">
<table width="100%" style="max-width:520px;background:#1B2236;border:1px solid #2a3350;border-radius:12px;padding:32px">
<tr><td style="font-family:Georgia,serif;font-size:22px;color:#EEE8DC">TheGent's<span style="color:#D1AE6E">.</span></td></tr>
<tr><td style="padding-top:20px;font-family:Georgia,serif;font-size:26px;line-height:1.3">Hi ${esc(opts.name || "there")}, your Style Report is ready ✨</td></tr>
<tr><td style="padding-top:12px;font-size:15px;line-height:1.6;color:#9BA1B5">Your face shape, haircut, beard, colours, fits, 16 outfits and a 90-day plan — all built around you. The PDF is attached.</td></tr>
<tr><td style="padding-top:24px"><a href="${opts.reportUrl}" style="display:inline-block;background:#D1AE6E;color:#121726;text-decoration:none;font-weight:bold;padding:14px 22px;border-radius:12px">Open my report</a></td></tr>
${opts.invoiceUrl ? `<tr><td style="padding-top:16px;font-size:13px"><a href="${opts.invoiceUrl}" style="color:#D1AE6E">Download your GST invoice</a> (link valid for 7 days)</td></tr>` : ""}
<tr><td style="padding-top:28px;font-size:12px;color:#9BA1B5">Reference ${esc(opts.reference)}</td></tr>
</table></td></tr></table></body></html>`;
  const body: any = { from: opts.from, to: [opts.to], subject: "Your TheGent Style Report is ready ✨", html };
  if (opts.pdf) {
    let bin = ""; for (let i = 0; i < opts.pdf.length; i += 0x8000) bin += String.fromCharCode(...opts.pdf.subarray(i, i + 0x8000));
    body.attachments = [{ filename: "TheGent-Style-Report.pdf", content: btoa(bin) }];
  }
  try {
    const res = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" }, body: JSON.stringify(body) });
    const j: any = await res.json().catch(() => ({}));
    if (!res.ok) return { status: "failed", detail: String(j?.message ?? res.status).slice(0, 300) };
    return { status: "sent", providerId: j?.id };
  } catch (e: any) { return { status: "failed", detail: String(e?.message ?? e).slice(0, 300) }; }
}

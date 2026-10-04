import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Access = {
  userId: string;
  isStaff: boolean;
  status: "active" | "suspended" | "deleted";
  needsOnboarding: boolean;
};

/** Server-side role + status check (uses has_role via is_staff). */
export const getMyAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Access> => {
    const { supabase, userId } = context;
    const [staff, profile, terms] = await Promise.all([
      supabase.rpc("is_staff", { _user_id: userId }),
      supabase.from("profiles").select("status, full_name, city").eq("id", userId).maybeSingle(),
      supabase.from("consents").select("id").eq("user_id", userId).eq("consent_type", "terms").eq("granted", true).limit(1),
    ]);
    return {
      userId,
      isStaff: !!staff.data,
      status: (profile.data?.status ?? "active") as Access["status"],
      needsOnboarding: !profile.data?.full_name || !profile.data?.city || !(terms.data && terms.data.length),
    };
  });

async function removeFolder(admin: any, bucket: string, userId: string) {
  const paths: string[] = [];
  const walk = async (prefix: string) => {
    const { data } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
    for (const item of data ?? []) {
      const p = `${prefix}/${item.name}`;
      if (item.id) paths.push(p);
      else await walk(p);
    }
  };
  await walk(userId);
  for (let i = 0; i < paths.length; i += 100) await admin.storage.from(bucket).remove(paths.slice(i, i + 100));
  return paths.length;
}

export const exportMyData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [profile, orders, reports, consents] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("orders").select("*").eq("user_id", userId),
      supabase.from("reports").select("id, order_id, data, version, published_at, created_at").eq("user_id", userId),
      supabase.from("consents").select("consent_type, granted, version, created_at").eq("user_id", userId).order("created_at"),
    ]);
    return { exported_at: new Date().toISOString(), profile: profile.data, orders: orders.data ?? [], reports: reports.data ?? [], consents: consents.data ?? [] };
  });

export const deleteMyPhotos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const count = await removeFolder(supabaseAdmin, "photos", userId);
    await supabaseAdmin.from("photos").delete().eq("user_id", userId);
    await supabaseAdmin.from("audit_log").insert({ actor_id: userId, action: "photos_deleted", entity: "user", entity_id: userId, after: { files: count } });
    return { deleted: count };
  });

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const photos = await removeFolder(supabaseAdmin, "photos", userId);
    const renders = await removeFolder(supabaseAdmin, "renders", userId);
    await supabaseAdmin.from("photos").delete().eq("user_id", userId);
    const { data: before } = await supabaseAdmin.from("profiles").select("full_name, email, phone, city").eq("id", userId).maybeSingle();
    await supabaseAdmin.from("profiles").update({
      full_name: null, email: null, phone: null, city: null, age: null, height_cm: null, weight_kg: null,
      budget_band: null, marketing_opt_in: false, whatsapp_opt_in: false, status: "deleted",
    }).eq("id", userId);
    await supabaseAdmin.from("audit_log").insert({
      actor_id: userId, action: "account_deleted", entity: "user", entity_id: userId,
      before: { had_name: !!before?.full_name, had_email: !!before?.email, had_phone: !!before?.phone },
      after: { photos_removed: photos, renders_removed: renders, orders_kept: true },
    });
    // Block future sign-ins and end every session; orders/invoices are kept for tax records.
    await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
    return { ok: true };
  });

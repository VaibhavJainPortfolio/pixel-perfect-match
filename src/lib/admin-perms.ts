// Admin role → area permissions. Shared by the sidebar (hide items) and server functions (enforce).
export type StaffRole = "super_admin" | "admin" | "support" | "stylist";
export type Area =
  | "dashboard" | "users" | "users_manage" | "roles" | "orders" | "orders_manage" | "refunds" | "pipeline"
  | "review" | "reports" | "catalog_read" | "catalog_write" | "ai_settings" | "coupons" | "payments"
  | "content" | "business" | "tickets" | "notifications" | "audit";

const ALL: Area[] = ["dashboard", "users", "users_manage", "roles", "orders", "orders_manage", "refunds", "pipeline", "review", "reports",
  "catalog_read", "catalog_write", "ai_settings", "coupons", "payments", "content", "business", "tickets", "notifications", "audit"];

export const ROLE_AREAS: Record<StaffRole, Area[]> = {
  super_admin: ALL,
  admin: ALL.filter((a) => a !== "ai_settings" && a !== "roles"),
  support: ["dashboard", "orders", "refunds", "users", "tickets", "notifications"],
  stylist: ["review", "reports", "catalog_read", "orders"],
};

/** Support may refund at most this much per refund (paise). */
export const SUPPORT_REFUND_CAP_PAISE = 250_000;

export function areasFor(roles: string[]): Set<Area> {
  const s = new Set<Area>();
  for (const r of roles) for (const a of ROLE_AREAS[r as StaffRole] ?? []) s.add(a);
  return s;
}
export function can(roles: string[], area: Area) { return areasFor(roles).has(area); }
export function topRole(roles: string[]) {
  return (["super_admin", "admin", "support", "stylist"] as const).find((r) => roles.includes(r)) ?? null;
}

/** Server-side gate: roles are read from user_roles through the caller's own session (has_role-backed RLS). */
export async function requireArea(context: { supabase: any; userId: string }, area: Area) {
  const { data } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
  const roles = (data ?? []).map((r: any) => r.role as string);
  if (!can(roles, area)) throw new Error("You don't have access to this.");
  return roles;
}

export async function audit(admin: any, actorId: string, action: string, entity: string, entityId: string | null, before: unknown, after: unknown) {
  await admin.from("audit_log").insert({ actor_id: actorId, action, entity, entity_id: entityId, before: before ?? null, after: after ?? null });
}

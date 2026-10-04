import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { fetchMyRoles, STAFF_ROLES } from "@/hooks/use-auth";
import { Logo } from "@/components/gent/PageShell";
import { ThemeToggle } from "@/components/gent/ThemeToggle";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const roles = await fetchMyRoles(context.user.id);
    if (!roles.some((r) => (STAFF_ROLES as readonly string[]).includes(r))) throw redirect({ to: "/app" });
    return { roles };
  },
  head: () => ({ meta: [{ title: "Admin — TheGent's" }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

const links = [
  ["/admin", "Overview"], ["/admin/orders", "Orders"], ["/admin/pipeline", "Pipeline"],
  ["/admin/review-queue", "Review queue"], ["/admin/users", "Users"], ["/admin/catalog", "Catalog"],
  ["/admin/rulebook", "Rulebook"], ["/admin/ai-settings", "AI settings"], ["/admin/coupons", "Coupons"],
  ["/admin/payments", "Payments"], ["/admin/audit-log", "Audit log"],
] as const;

function AdminLayout() {
  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-border bg-card md:w-60 md:shrink-0 md:border-r md:border-b-0">
        <div className="flex h-16 items-center justify-between px-5">
          <Logo /><ThemeToggle />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-6">
          {links.map(([to, label]) => (
            <Link key={to} to={to} activeOptions={{ exact: to === "/admin" }}
              className="whitespace-nowrap rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              activeProps={{ className: "bg-gold-soft text-gold" }}>
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 px-5 py-8 md:px-10"><Outlet /></main>
    </div>
  );
}

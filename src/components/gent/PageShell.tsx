import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useSession } from "@/hooks/use-auth";
import { ThemeToggle } from "./ThemeToggle";
import { GoldButton } from "./buttons";

const nav = [
  { to: "/free-check", label: "Free check" },
  { to: "/sample-report", label: "Sample" },
  { to: "/pricing", label: "Pricing" },
] as const;

export function Logo() {
  return (
    <Link to="/" className="font-display text-xl text-foreground">
      TheGent's<span className="text-gold">.</span>
    </Link>
  );
}

export function PageShell({
  children,
  className,
  width = "max-w-5xl",
}: {
  children: ReactNode;
  className?: string;
  width?: string;
}) {
  const { user } = useSession();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className={cn("mx-auto flex h-16 items-center justify-between gap-3 px-5", width)}>
          <Logo />
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} className="hover:text-foreground" activeProps={{ className: "text-gold" }}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <GoldButton asChild size="sm"><Link to="/app">My account</Link></GoldButton>
            ) : (
              <GoldButton asChild size="sm"><Link to="/login">Sign in</Link></GoldButton>
            )}
          </div>
        </div>
        <nav className="flex gap-5 overflow-x-auto border-t border-border px-5 py-2.5 text-sm text-muted-foreground md:hidden">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} activeProps={{ className: "text-gold" }}>{n.label}</Link>
          ))}
        </nav>
      </header>
      <main className={cn("mx-auto w-full flex-1 px-5 py-10", width, className)}>{children}</main>
      <footer className="border-t border-border">
        <div className={cn("mx-auto flex flex-col gap-4 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between", width)}>
          <p>© {new Date().getFullYear()} TheGent's Style Report</p>
          <div className="flex gap-5">
            <Link to="/legal/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/legal/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/legal/refunds" className="hover:text-foreground">Refunds</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** Simple titled placeholder page for routes not yet built. */
export function Placeholder({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="text-3xl text-foreground sm:text-4xl">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

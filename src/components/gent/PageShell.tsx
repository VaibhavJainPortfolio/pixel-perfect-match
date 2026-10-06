import type { ReactNode } from "react";
import { SITE } from "@/lib/site";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useSession } from "@/hooks/use-auth";
import { ThemeToggle } from "./ThemeToggle";
import { GoldButton } from "./buttons";

const nav = [
  { href: "#how-it-works", label: "How It Works" },
  { href: "#what-you-get", label: "What You Get" },
  { href: "#ai-try-on", label: "AI Try-On" },
  { href: "#pricing", label: "Pricing" },
] as const;

export function Logo() {
  return (
    <Link to="/" className="font-display text-xl text-foreground tracking-tight hover:opacity-95 transition-opacity">
      TheGent<span className="text-gold">.</span>
    </Link>
  );
}

export function PageShell({
  children,
  className,
  width = "max-w-[1360px]",
}: {
  children: ReactNode;
  className?: string;
  width?: string;
}) {
  const { user } = useSession();
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur-md transition-all">
        <div className={cn("mx-auto flex h-16 items-center justify-between gap-4 px-6", width)}>
          <Logo />
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            {nav.map((n) => (
              <a key={n.href} href={n.href} className="transition-colors hover:text-foreground">
                {n.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {user ? (
              <GoldButton asChild size="sm"><Link to="/app">My Account</Link></GoldButton>
            ) : (
              <>
                <Link to="/login" className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline-block">
                  Sign In
                </Link>
                <GoldButton asChild size="sm">
                  <Link to="/app/checkout" search={{ product: "style_report" }}>Get My Report</Link>
                </GoldButton>
              </>
            )}
          </div>
        </div>
        <nav className="flex gap-6 overflow-x-auto border-t border-border/60 px-6 py-2.5 text-sm text-muted-foreground md:hidden">
          {nav.map((n) => (
            <a key={n.href} href={n.href} className="shrink-0 hover:text-foreground">{n.label}</a>
          ))}
        </nav>
      </header>
      <main className={cn("mx-auto w-full flex-1 px-5 py-10", width, className)}>{children}</main>
      <footer className="border-t border-border pb-20 md:pb-0">
        <div className={cn("mx-auto grid gap-8 px-5 py-10 text-sm text-muted-foreground sm:grid-cols-3", width)}>
          <div className="space-y-2">
            <Logo />
            <p>Personal style reports for Indian men.</p>
            <a href={`mailto:${SITE.email}`} className="block hover:text-gold">{SITE.email}</a>
          </div>
          <div className="space-y-2">
            <p className="eyebrow">Legal</p>
            <Link to="/legal/privacy" className="block hover:text-foreground">Privacy policy</Link>
            <Link to="/legal/terms" className="block hover:text-foreground">Terms of service</Link>
            <Link to="/legal/refunds" className="block hover:text-foreground">Refund policy</Link>
          </div>
          <div className="space-y-2">
            <p className="eyebrow">Grievance officer</p>
            <p>{SITE.grievanceName}</p>
            <a href={`mailto:${SITE.grievanceEmail}`} className="block hover:text-gold">{SITE.grievanceEmail}</a>
            <p className="pt-2">{SITE.address}</p>
          </div>
        </div>
        <p className={cn("mx-auto border-t border-border px-5 py-5 text-xs text-muted-foreground", width)}>
          © {new Date().getFullYear()} TheGent's Style Report. AI-generated images are illustrations, not guarantees.
        </p>
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

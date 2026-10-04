import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "./PageShell";
import { Card, SectionHeading } from "./primitives";
import { GhostButton } from "./buttons";
import { SITE } from "@/lib/site";

export function AccountHold() {
  return (
    <PageShell width="max-w-md">
      <SectionHeading as="h1" eyebrow="Account" title="Your account is on hold" />
      <Card className="mt-8 space-y-4">
        <p className="text-muted-foreground">Please contact support and we'll help you sort it out.</p>
        <a className="block text-gold underline" href={`mailto:${(SITE as any).email ?? ""}`}>Contact support</a>
        <GhostButton block onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }}>Sign out</GhostButton>
      </Card>
    </PageShell>
  );
}

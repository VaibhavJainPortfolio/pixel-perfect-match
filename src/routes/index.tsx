import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, ScanFace, Shirt, FileText } from "lucide-react";
import { PageShell } from "@/components/gent/PageShell";
import { GoldButton, GhostButton } from "@/components/gent/buttons";
import { Card, SectionHeading, StatTile } from "@/components/gent/primitives";
import hero from "@/assets/hero-gent.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TheGent's Style Report — AI personal styling for Indian men" },
      { name: "description", content: "Upload 8 photos. Get a personal style report: face shape, hairstyle, beard, 16 outfits, watches, fragrance and a 90-day plan." },
      { property: "og:title", content: "TheGent's Style Report" },
      { property: "og:description", content: "Your personal style report, built from your own photos." },
    ],
  }),
  component: Index,
});

const steps = [
  { icon: Camera, title: "Upload 8 photos", text: "Face, profile, full body and wrist. Takes five minutes." },
  { icon: ScanFace, title: "We read your features", text: "Face shape, body type, skin tone and proportions." },
  { icon: Shirt, title: "See yourself styled", text: "16 outfits, with AI images of you wearing them." },
  { icon: FileText, title: "Get your report", text: "On the web and as a PDF on WhatsApp and email." },
];

function Index() {
  return (
    <PageShell>
      <section className="grid items-center gap-10 md:grid-cols-2">
        <div className="space-y-6">
          <p className="eyebrow">Personal styling · ₹1,999</p>
          <h1 className="text-5xl leading-[1.05] text-foreground sm:text-6xl">
            Dress for the man <span className="text-gold">you already are.</span>
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            A style report made from your own photos — what suits your face, your build and your skin, down to the watch and the fragrance.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <GoldButton asChild size="lg"><Link to="/pricing">Get my report</Link></GoldButton>
            <GhostButton asChild size="lg"><Link to="/free-check">Try the free check</Link></GhostButton>
          </div>
        </div>
        <img src={hero} alt="Man in a tailored navy blazer" width={896} height={1152} className="w-full rounded-lg border border-border object-cover" />
      </section>

      <section className="mt-16 grid grid-cols-3 gap-3">
        <StatTile label="Outfits" value="16" />
        <StatTile label="Photos" value="8" />
        <StatTile label="Day plan" value="90" />
      </section>

      <section className="mt-20 space-y-8">
        <SectionHeading eyebrow="How it works" title="Four steps, one sharper wardrobe." />
        <div className="grid gap-3 sm:grid-cols-2">
          {steps.map((s, i) => (
            <Card key={s.title} className="flex gap-4">
              <span className="font-display text-2xl text-gold">0{i + 1}</span>
              <div className="space-y-1">
                <h3 className="flex items-center gap-2 text-lg text-foreground"><s.icon className="size-4 text-gold" />{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.text}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-20">
        <Card className="space-y-4 p-8 text-center">
          <h2 className="text-3xl text-foreground">See a real report first.</h2>
          <p className="text-muted-foreground">Browse a full sample before you pay.</p>
          <GhostButton asChild><Link to="/sample-report">View sample report</Link></GhostButton>
        </Card>
      </section>
    </PageShell>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/gent/PageShell";
import { Card, SectionHeading } from "@/components/gent/primitives";
import { GoldButton, GhostButton } from "@/components/gent/buttons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteMyAccount, deleteMyPhotos, exportMyData } from "@/lib/account.functions";
import { CONSENT_VERSION } from "@/components/gent/OnboardingSheet";

export const Route = createFileRoute("/_authenticated/app/account")({
  head: () => ({
    meta: [
      { title: "Account — TheGent's Style Report" },
      { name: "description", content: "Your profile, notification preferences, sessions and data." },
      { property: "og:title", content: "Account — TheGent's" },
      { property: "og:description", content: "Your profile, notification preferences, sessions and data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

type Pref = "whatsapp" | "email" | "marketing";
type SessionRow = { id: string; created_at: string; updated_at: string | null; user_agent: string | null; ip: string | null };

function Page() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [prefs, setPrefs] = useState<Record<Pref, boolean>>({ whatsapp: false, email: true, marketing: false });
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [phoneOtp, setPhoneOtp] = useState<string | null>(null);

  const exportFn = useServerFn(exportMyData);
  const delPhotosFn = useServerFn(deleteMyPhotos);
  const delAccountFn = useServerFn(deleteMyAccount);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from("profiles").select("full_name, email, city").eq("id", user.id).maybeSingle();
      setName(p?.full_name ?? ""); setEmail(p?.email ?? ""); setCity(p?.city ?? "");
      const { data: c } = await supabase.from("consents").select("consent_type, granted, created_at")
        .eq("user_id", user.id).in("consent_type", ["whatsapp", "email", "marketing"]).order("created_at", { ascending: false });
      const next: Record<Pref, boolean> = { whatsapp: false, email: true, marketing: false };
      const seen = new Set<string>();
      for (const r of c ?? []) if (!seen.has(r.consent_type)) { seen.add(r.consent_type); next[r.consent_type as Pref] = r.granted; }
      setPrefs(next);
      const { data: s } = await supabase.rpc("my_sessions");
      setSessions((s ?? []) as SessionRow[]);
    })();
  }, [user.id]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ full_name: name.trim(), email: email.trim(), city: city.trim() }).eq("id", user.id);
    setBusy(false);
    error ? toast.error(error.message) : toast.success("Saved.");
  };

  const togglePref = async (k: Pref, v: boolean) => {
    setPrefs((p) => ({ ...p, [k]: v }));
    const { error } = await supabase.from("consents").insert({ user_id: user.id, consent_type: k, granted: v, version: CONSENT_VERSION, user_agent: navigator.userAgent });
    if (error) { toast.error(error.message); setPrefs((p) => ({ ...p, [k]: !v })); return; }
    if (k !== "email") await supabase.from("profiles").update(k === "whatsapp" ? { whatsapp_opt_in: v } : { marketing_opt_in: v }).eq("id", user.id);
  };

  const startPhoneChange = async () => {
    const d = newPhone.replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(d)) { toast.error("Enter a valid 10-digit Indian mobile number."); return; }
    const { error } = await supabase.auth.updateUser({ phone: `+91${d}` });
    if (error) { toast.error(error.message); return; }
    setPhoneOtp(""); toast.success("OTP sent to the new number.");
  };
  const confirmPhone = async (code: string) => {
    const { error } = await supabase.auth.verifyOtp({ phone: `+91${newPhone}`, token: code, type: "phone_change" });
    if (error) { toast.error("That code didn't work."); setPhoneOtp(""); return; }
    await supabase.from("profiles").update({ phone: `+91${newPhone}` }).eq("id", user.id);
    toast.success("Phone number updated."); setPhoneOtp(null); setNewPhone("");
  };

  const download = async () => {
    const data = await exportFn();
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "thegents-my-data.json"; a.click(); URL.revokeObjectURL(url);
  };

  const signOutAndLeave = async (scope: "global" | "local") => {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut({ scope });
    navigate({ to: "/login", replace: true });
  };

  return (
    <PageShell width="max-w-xl">
      <SectionHeading as="h1" eyebrow="Account" title="Your account" />

      <Card className="mt-8">
        <h2 className="font-display text-xl">Profile</h2>
        <form onSubmit={saveProfile} className="mt-4 space-y-4">
          <div className="space-y-2"><Label htmlFor="a-name">Full name</Label><Input id="a-name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="a-email">Email (for receipts)</Label><Input id="a-email" type="email" maxLength={120} value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="a-city">City</Label><Input id="a-city" maxLength={60} value={city} onChange={(e) => setCity(e.target.value)} /></div>
          <GoldButton type="submit" disabled={busy}>Save changes</GoldButton>
        </form>
        <div className="mt-6 border-t border-border pt-4">
          <Label>Phone</Label>
          <p className="mt-1 text-foreground">{user.phone ? `+${user.phone}` : "Not added"}</p>
          {phoneOtp === null ? (
            <div className="mt-3 flex gap-2">
              <Input inputMode="numeric" maxLength={10} placeholder="New 10-digit number" value={newPhone} onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ""))} />
              <GhostButton onClick={startPhoneChange}>Send OTP</GhostButton>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-muted-foreground">Enter the code sent to +91 {newPhone}</p>
              <InputOTP maxLength={6} value={phoneOtp} onChange={(v) => { setPhoneOtp(v); if (v.length === 6) confirmPhone(v); }}>
                <InputOTPGroup>{[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup>
              </InputOTP>
            </div>
          )}
        </div>
      </Card>

      <Card className="mt-6">
        <h2 className="font-display text-xl">Notifications</h2>
        <div className="mt-4 space-y-4">
          {([["whatsapp", "WhatsApp updates"], ["email", "Email updates"], ["marketing", "Style tips and offers"]] as const).map(([k, label]) => (
            <div key={k} className="flex items-center justify-between">
              <Label htmlFor={`p-${k}`}>{label}</Label>
              <Switch id={`p-${k}`} checked={prefs[k]} onCheckedChange={(v) => togglePref(k, v)} />
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-6">
        <h2 className="font-display text-xl">Active sessions</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {sessions.length === 0 && <li className="text-muted-foreground">No sessions found.</li>}
          {sessions.map((s) => (
            <li key={s.id} className="border-b border-border pb-3 last:border-0">
              <p className="truncate text-foreground">{deviceName(s.user_agent)}</p>
              <p className="text-muted-foreground">Last active {new Date(s.updated_at ?? s.created_at).toLocaleString("en-IN")}{s.ip ? ` · ${s.ip}` : ""}</p>
            </li>
          ))}
        </ul>
        <GhostButton className="mt-4" onClick={() => signOutAndLeave("global")}>Sign out everywhere</GhostButton>
      </Card>

      <Card className="mt-6 space-y-3">
        <h2 className="font-display text-xl">My data</h2>
        <GhostButton block onClick={download}>Download my data</GhostButton>
        <Confirm
          trigger={<GhostButton block>Delete my photos now</GhostButton>}
          title="Delete your photos?"
          body="All photos you uploaded will be permanently removed. Reports already made are kept."
          action="Delete photos"
          onConfirm={async () => { const r = await delPhotosFn(); toast.success(`${r.deleted} photo(s) deleted.`); }}
        />
        <Confirm
          trigger={<button className="w-full rounded-lg border border-destructive px-5 py-2.5 text-sm font-semibold text-destructive">Delete my account</button>}
          title="Delete your account?"
          body="We will permanently delete your photos and AI images, and remove your name, email, phone and city. Your orders and invoices are kept because tax law requires it. You will be signed out and can't sign back in with this account."
          action="Delete account"
          onConfirm={async () => { await delAccountFn(); await signOutAndLeave("local"); toast.success("Your account has been deleted."); }}
        />
      </Card>

      <GhostButton className="mt-6" onClick={() => signOutAndLeave("local")}>Sign out</GhostButton>
    </PageShell>
  );
}

function deviceName(ua: string | null) {
  if (!ua) return "Unknown device";
  const os = /iPhone|iPad/.test(ua) ? "iPhone" : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "Device";
  const br = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "Browser";
  return `${br} on ${os}`;
}

function Confirm({ trigger, title, body, action, onConfirm }: { trigger: React.ReactNode; title: string; body: string; action: string; onConfirm: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{body}</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={busy} className="bg-destructive text-destructive-foreground"
            onClick={async (e) => { e.preventDefault(); setBusy(true); try { await onConfirm(); } catch { toast.error("Something went wrong. Please try again."); } setBusy(false); }}>
            {busy ? "Working…" : action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

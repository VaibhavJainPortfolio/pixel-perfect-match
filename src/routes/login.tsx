import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getMyAccess } from "@/lib/account.functions";
import { PageShell } from "@/components/gent/PageShell";
import { GoldButton, GhostButton } from "@/components/gent/buttons";
import { Card, SectionHeading } from "@/components/gent/primitives";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — TheGent's Style Report" },
      { name: "description", content: "Sign in with your phone number to see your orders and style reports." },
      { property: "og:title", content: "Sign in — TheGent's" },
      { property: "og:description", content: "Access your style report." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Login,
});

const toE164 = (digits: string) => `+91${digits.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "").slice(-10)}`;

function Login() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "otp" | "email">("phone");
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);

  const routeAfterLogin = async () => {
    try {
      const a = await getMyAccess();
      navigate({ to: a.isStaff ? "/admin" : "/app", replace: true });
    } catch { navigate({ to: "/app", replace: true }); }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) routeAfterLogin(); });
    const { data } = supabase.auth.onAuthStateChange((e) => { if (e === "SIGNED_IN") routeAfterLogin(); });
    return () => data.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendOtp = async () => {
    const digits = phone.replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(digits.slice(-10)) || digits.length < 10) { toast.error("Enter a valid 10-digit Indian mobile number."); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: toE164(digits) });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setStep("otp"); setOtp(""); setCooldown(30);
    toast.success("OTP sent by SMS.");
  };

  const verify = async (code: string) => {
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ phone: toE164(phone), token: code, type: "sms" });
    setBusy(false);
    if (error) { toast.error("That code didn't work. Try again."); setOtp(""); }
  };

  const google = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin + "/login" } });
    if (error) toast.error("Google sign-in failed: " + error.message);
  };

  const magic = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + "/login" } });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Check your email for a sign-in link.");
  };

  return (
    <PageShell width="max-w-md">
      <SectionHeading as="h1" eyebrow="Welcome" title="Sign in" />
      <Card className="mt-8 space-y-5">
        {step === "phone" && (
          <form onSubmit={(e) => { e.preventDefault(); sendOtp(); }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Mobile number</Label>
              <div className="flex">
                <span className="flex items-center rounded-l-md border border-r-0 border-input px-3 text-sm text-muted-foreground">+91</span>
                <Input id="phone" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} placeholder="98765 43210"
                  className="rounded-l-none" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} required />
              </div>
            </div>
            <GoldButton block type="submit" disabled={busy}>Send OTP</GoldButton>
          </form>
        )}

        {step === "otp" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Enter the 6-digit code sent to +91 {phone}.</p>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={(v) => { setOtp(v); if (v.length === 6) verify(v); }} disabled={busy}>
                <InputOTPGroup>{[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup>
              </InputOTP>
            </div>
            <div className="flex justify-between text-sm">
              <button className="text-muted-foreground hover:text-gold" onClick={() => setStep("phone")}>Change number</button>
              <button className="text-gold disabled:text-muted-foreground" disabled={cooldown > 0 || busy} onClick={sendOtp}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
              </button>
            </div>
          </div>
        )}

        {step === "email" && (
          <form onSubmit={magic} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <GoldButton block type="submit" disabled={busy}>Email me a sign-in link</GoldButton>
            <button type="button" className="w-full text-sm text-muted-foreground hover:text-gold" onClick={() => setStep("phone")}>Use phone instead</button>
          </form>
        )}

        <div className="text-center text-xs uppercase tracking-widest text-muted-foreground">or</div>
        <GhostButton block onClick={google}>Continue with Google</GhostButton>
        {step !== "email" && <GhostButton block onClick={() => setStep("email")}>Email me a link</GhostButton>}
      </Card>
    </PageShell>
  );
}

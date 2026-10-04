<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Roles live only in `user_roles`; RLS uses `has_role`/`is_admin`/`is_staff` security-definer functions — prevents privilege escalation.
- Signed-in pages live under `src/routes/_authenticated/`; admin pages under `_authenticated/admin*` gated by a staff-role check in `admin.tsx` — one gate per area.
- Storage buckets are private; object paths start with the owner's user id so folder-based RLS works; read via signed URLs only.
- Shared UI primitives live in `src/components/gent/`; colors come only from tokens in `src/styles.css` (dark on :root, `.light` override).
- Access checks (staff role, suspended/deleted status, onboarding) go through the `getMyAccess` server fn in `src/lib/account.functions.ts`; `/app` and `/admin` layouts both use it — one server-side source of truth.
- Account deletion/photo deletion run as authenticated server fns using the admin client only after auth; profiles are anonymised (never hard-deleted) so orders/invoices stay for tax records.
- Consent changes always insert new `consents` rows; the latest row per type is current — history is never overwritten.
- Payments: prices/coupons are computed only server-side (`buildQuote` in `src/lib/payments.server.ts`); `markOrderPaid` is idempotent and shared by the browser verify call and the Razorpay webhook (`/api/public/razorpay-webhook`, deduped via `payment_events`).
- Invoices number via the `next_invoice_number` DB function (per financial year) and use seller details from the single-row `business_settings` table; GST split compares customer state to the seller state.
- Photo intake: MediaPipe guidance + measurements run in the browser (`GuidedCamera`, `vision-metrics.ts`); AI quality checks and all photo-row writes happen server-side in `intake.functions.ts`. A DB trigger stops customers setting `photos.quality_status` themselves.
- AI calls go through the Lovable AI Gateway: face/body/skin analysis uses Claude on the Messages API (`analysis-agents.server.ts`, Zod-validated, one corrective retry, prompts from `ai_settings`); other calls use Responses. `ai_settings` model values are used only when they are exact gateway ids for that API, otherwise the default.
- Report pipeline: steps are claimed and dispatched in the DB (`dispatch_ready_steps` → pg_net → `/api/public/pipeline/step`, token in `internal_config`); agents live in `src/lib/pipeline.server.ts`; a 2-min `pipeline-tick` cron re-queues stuck/retry-due steps and unschedules itself when idle — survives closed browsers without self-fetch.

# Admin panel build plan

Most admin pages exist only as placeholders today (review queue, rulebook, catalog and business settings work). The brief is large, so it is built in four phases. Each phase ships working pages before the next starts.

## Phase 1 — Foundation, dashboard, users
- Sidebar that hides items per role (super_admin, admin, support, stylist), top bar with search (order reference, phone, email) and role badge. Works on phones via a slide-out menu.
- Server-side role check on every admin action; every create/update/delete writes an audit log row (actor, action, entity, before, after).
- Dashboard: KPI tiles (today / 7d / 30d), revenue and orders line chart, funnel, AI cost per step, alerts panel.
- Users list with filters and CSV export; user detail with profile, consents, orders, reports, tickets, notifications, activity timeline.
- User actions with confirm + required reason: edit, suspend/reactivate, resend report, grant free report, delete photos, delete account, roles (super_admin only), invite staff by email, "View as customer" read-only.

## Phase 2 — Orders and pipeline
- Orders list with filters and CSV; order detail with payment/invoice, 8 photos + quality, step timeline with expandable input/output, render approve/reject, report preview, notifications.
- Actions: retry step, re-run from step, regenerate one render, edit report JSON with validation and republish, resend, full/partial Razorpay refund (support capped at ₹2,500), cancel.
- Pipeline monitor: live runs, 30-min red flag, bulk retry, 7-day step success rate and duration.

## Phase 3 — Review queue, catalog/rulebook, AI settings
- Review queue upgrade: claim, issues beside report, section editing, render toggles, "Approve and deliver", "Request re-run".
- Catalog/rulebook: image preview, active toggle, category/colour/price filters; read-only for stylists.
- AI settings (super_admin): models, temperature, renders per report, image provider, prompt editor with version history, "Test on order" with output diff (customer report untouched), per-report and daily spend caps that pause the pipeline and alert.

## Phase 4 — Coupons, payments, content, tickets, audit log
- Coupons CRUD with usage stats; payments list synced from Razorpay with refund status.
- Site content editor (landing images, pricing, FAQ, approved reviews); business settings plus grievance officer.
- Tickets inbox: assign, reply by WhatsApp/email, close. Audit log viewer with actor/entity/date filters.

## Technical details
- Shared `requireStaff(roles)` server middleware + `audit()` helper in a `*.server.ts`; all admin mutations go through `admin-*.functions.ts` server functions.
- New tables: `prompt_versions`, `staff_invites` (or Auth admin invite), refunds on `orders`/`payment_events`; spend caps in `ai_settings`, enforced in `dispatch_ready_steps`.
- Charts with recharts; realtime on `pipeline_runs`.
- Visits in the funnel need page-view tracking; a lightweight `page_views` table is added.

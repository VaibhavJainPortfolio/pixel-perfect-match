alter table public.reports add column if not exists share_expires_at timestamptz;
alter table public.orders add column if not exists needs_support boolean not null default false;

create table public.report_feedback (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  user_id uuid not null,
  rating integer not null,
  comment text,
  created_at timestamptz not null default now()
);
grant select, insert on public.report_feedback to authenticated;
grant all on public.report_feedback to service_role;
alter table public.report_feedback enable row level security;
create policy "Own feedback insert" on public.report_feedback for insert to authenticated
  with check (user_id = auth.uid() and rating between 1 and 5 and exists (select 1 from public.reports r where r.id = report_id and r.user_id = auth.uid()));
create policy "Own or staff read feedback" on public.report_feedback for select to authenticated
  using (user_id = auth.uid() or public.is_staff(auth.uid()));

create table public.report_checklist (
  report_id uuid not null references public.reports(id) on delete cascade,
  user_id uuid not null,
  checked jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (report_id, user_id)
);
grant select, insert, update on public.report_checklist to authenticated;
grant all on public.report_checklist to service_role;
alter table public.report_checklist enable row level security;
create policy "Own checklist" on public.report_checklist for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from public.reports r where r.id = report_id and r.user_id = auth.uid()));
create trigger trg_report_checklist_updated before update on public.report_checklist for each row execute function public.set_updated_at();
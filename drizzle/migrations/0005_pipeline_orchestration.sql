-- lovable-cron-fallback-reviewed: user requires a 2-minute stuck-step sweep; job is armed when a run starts/resumes and unschedules itself once no runs are active.
create extension if not exists pg_net;
create extension if not exists pg_cron;

alter table public.pipeline_steps add column if not exists next_attempt_at timestamptz;
create unique index if not exists pipeline_steps_run_step_key on public.pipeline_steps(run_id, step_key);
alter table public.renders add column if not exists run_id uuid references public.pipeline_runs(id) on delete cascade;
create unique index if not exists renders_order_look_key on public.renders(order_id, look_key);

create table if not exists public.internal_config (key text primary key, value text not null);
grant all on public.internal_config to service_role;
alter table public.internal_config enable row level security;
insert into public.internal_config(key, value) values
  ('pipeline_token', encode(extensions.gen_random_bytes(32), 'hex')),
  ('app_base_url', 'https://project--80529f9b-2aad-4ca3-aa54-add0402bd412-dev.lovable.app')
on conflict (key) do nothing;

drop policy if exists "Own runs read" on public.pipeline_runs;
create policy "Own runs read" on public.pipeline_runs for select to authenticated
  using (exists (select 1 from public.orders o where o.id = pipeline_runs.order_id and o.user_id = auth.uid()));
grant select on public.pipeline_runs to authenticated;
alter table public.pipeline_runs replica identity full;
do $$ begin
  alter publication supabase_realtime add table public.pipeline_runs;
exception when duplicate_object then null; end $$;

create or replace function public.touch_run_on_step() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    update public.pipeline_runs set updated_at = now(),
      current_step = case when new.status = 'running' then new.step_key else current_step end
    where id = new.run_id;
  end if;
  return new;
end $$;
drop trigger if exists trg_steps_touch_run on public.pipeline_steps;
create trigger trg_steps_touch_run after update on public.pipeline_steps for each row execute function public.touch_run_on_step();

create or replace function public.dispatch_ready_steps(_run uuid) returns integer
language plpgsql security definer set search_path = public, extensions as $$
declare
  s record; n int := 0;
  base text := (select value from public.internal_config where key = 'app_base_url');
  tok text := (select value from public.internal_config where key = 'pipeline_token');
begin
  for s in
    with deps(step, dep) as (values
      ('face_hair','measurements'),('body','measurements'),('skin','measurements'),
      ('eyewear','face_hair'),('eyewear','skin'),
      ('stylist','face_hair'),('stylist','body'),('stylist','skin'),('stylist','eyewear'),
      ('renders','stylist'),('review','renders'),('report_build','review'),('pdf','report_build'),('delivery','pdf')),
    ready as (
      select st.id from public.pipeline_steps st join public.pipeline_runs r on r.id = st.run_id
      where st.run_id = _run and r.status = 'running' and st.status = 'pending'
        and (st.next_attempt_at is null or st.next_attempt_at <= now())
        and not exists (select 1 from deps d join public.pipeline_steps p on p.run_id = st.run_id and p.step_key::text = d.dep
                        where d.step = st.step_key::text and p.status not in ('succeeded','skipped'))
      for update of st skip locked)
    update public.pipeline_steps st set status = 'running', started_at = now(), error = null
    from ready where st.id = ready.id returning st.id
  loop
    perform net.http_post(
      url := base || '/api/public/pipeline/step',
      body := jsonb_build_object('stepId', s.id),
      headers := jsonb_build_object('content-type','application/json','x-pipeline-token', tok),
      timeout_milliseconds := 900000);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.dispatch_ready_steps(uuid) from public, anon, authenticated;
grant execute on function public.dispatch_ready_steps(uuid) to service_role;

create or replace function public.pipeline_tick() returns void
language plpgsql security definer set search_path = public, cron as $$
declare r record;
begin
  if not exists (select 1 from public.pipeline_runs where status = 'running') then
    perform cron.unschedule('pipeline-tick') where exists (select 1 from cron.job where jobname = 'pipeline-tick');
    return;
  end if;
  update public.pipeline_steps st set status = 'pending', next_attempt_at = now(), error = 'Re-queued after timeout'
  from public.pipeline_runs pr
  where pr.id = st.run_id and pr.status = 'running' and st.status = 'running' and st.started_at < now() - interval '8 minutes';
  for r in select id from public.pipeline_runs where status = 'running' loop
    perform public.dispatch_ready_steps(r.id);
  end loop;
end $$;
revoke all on function public.pipeline_tick() from public, anon, authenticated;
grant execute on function public.pipeline_tick() to service_role;

-- Arms the 2-minute sweep (called when a run starts or resumes).
create or replace function public.arm_pipeline_tick() returns void
language plpgsql security definer set search_path = public, cron as $$
begin
  if not exists (select 1 from cron.job where jobname = 'pipeline-tick') then
    perform cron.schedule('pipeline-tick', '*/2 * * * *', 'select public.pipeline_tick()');
  end if;
end $$;
revoke all on function public.arm_pipeline_tick() from public, anon, authenticated;
grant execute on function public.arm_pipeline_tick() to service_role;
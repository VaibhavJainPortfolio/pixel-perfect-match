alter table public.renders
  add column if not exists cost_usd numeric not null default 0,
  add column if not exists attempts integer not null default 0,
  add column if not exists likeness_score numeric,
  add column if not exists body_preserved boolean,
  add column if not exists quality_issues jsonb,
  add column if not exists is_hero boolean not null default false;
insert into public.ai_settings(key, value) values
  ('prompt_render', to_jsonb('Photorealistic full-length photo of the same man in the reference photos. Keep his exact face, skin tone, age ({age}) and real build: {height}, {frame} build, {body_type_note}. Do not slim him or change his body. Hair: {haircut}. Beard: {beard}. Outfit: {outfit_items}. Setting: {setting_for_occasion}. Natural light, fashion lookbook style, head to toe in frame, no text, no logos.'::text)),
  ('prompt_render_check', to_jsonb('You compare an AI-generated fashion render with the real customer photos. Image 1 is his real front face photo, image 2 his real full-body photo (if present), the LAST image is the render. Judge whether the render shows the same person (face structure, skin tone, age, hairline, beard) and whether his real build is preserved (not slimmed, made taller or more muscular). Return JSON: {"likeness_score": number 0-10, "body_preserved": boolean, "issues": string[]}.'::text))
on conflict (key) do nothing;
-- ─────────────────────────────────────────────────────────────────────────────
-- Tipalti UX Research Tool — delta migrations
-- Run in: Supabase Dashboard → SQL Editor → Run
-- Fully idempotent — safe to run multiple times
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Drop click_events (no longer needed)
drop table if exists click_events cascade;

-- 2. Screener questions
create table if not exists screener_questions (
  id          uuid primary key default gen_random_uuid(),
  study_id    uuid references studies(id) on delete cascade,
  position    int  not null,
  prompt      text not null,
  kind        text not null check (kind in ('text','multiple_choice','yes_no')),
  options     jsonb,
  is_required boolean default false,
  unique (study_id, position)
);
alter table screener_questions enable row level security;
do $$ begin
  create policy "sq2_select" on screener_questions for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "sq2_insert" on screener_questions for insert with check (true);
exception when duplicate_object then null; end $$;

-- 3. Sessions: screener answers
alter table sessions add column if not exists screener_answers jsonb;

-- 4. Survey question types + new columns
alter table survey_questions
  drop constraint if exists survey_questions_kind_check;
alter table survey_questions
  add constraint survey_questions_kind_check
    check (kind in ('rating','text','opinion_scale','multiple_choice','yes_no','nps'));
alter table survey_questions add column if not exists options      jsonb;
alter table survey_questions add column if not exists scale_labels jsonb;

-- 5. Survey answer value columns
alter table survey_answers
  add column if not exists opinion_value int  check (opinion_value between 1 and 10),
  add column if not exists nps_value     int  check (nps_value between 0 and 10),
  add column if not exists choice_value  text,
  add column if not exists bool_value    boolean;

-- 6. Studies: management columns
alter table studies
  add column if not exists is_archived       boolean     default false,
  add column if not exists invite_expires_at timestamptz,
  add column if not exists max_responses     int;

-- 7. Chapters: Figma Make flag
alter table chapters add column if not exists is_figma_make boolean default false;

-- 8. Refresh study_summary view to expose is_archived
drop view if exists study_summary cascade;
create view study_summary as
select
  s.id,
  s.title,
  s.is_active,
  s.is_archived,
  s.chapter_count,
  s.created_at,
  count(se.id)::int                                                    as total_sessions,
  count(se.completed_at)::int                                          as completed_sessions,
  case
    when count(se.id) = 0 then null
    else round(count(se.completed_at)::numeric / count(se.id) * 100)
  end::int                                                             as completion_rate_pct
from studies s
left join sessions se on se.study_id = s.id
group by s.id;

-- 9. Delete policies (needed for archive/delete/reset operations)
do $$ begin
  create policy "studies_delete"  on studies  for delete using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "sessions_delete" on sessions for delete using (true);
exception when duplicate_object then null; end $$;

-- 10. Missing RLS policies that blocked chapter/question edits and caused
--     silent delete failures → duplicate-key errors on position updates
do $$ begin
  create policy "chapters_delete"  on chapters          for delete using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "sq_update"        on survey_questions  for update using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "sq_delete"        on survey_questions  for delete using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "sq2_delete"       on screener_questions for delete using (true);
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. Figma Trigger Definitions — named checkpoints per chapter
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists trigger_definitions (
  id          uuid primary key default gen_random_uuid(),
  chapter_id  uuid not null references chapters(id) on delete cascade,
  position    int  not null,
  name        text not null,
  frame_name  text not null,
  unique (chapter_id, position)
);
alter table trigger_definitions enable row level security;
do $$ begin
  create policy "td_select" on trigger_definitions for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "td_insert" on trigger_definitions for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "td_update" on trigger_definitions for update using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "td_delete" on trigger_definitions for delete using (true);
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. Trigger Events — fired when a participant reaches a tracked frame
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists trigger_events (
  id                    uuid primary key default gen_random_uuid(),
  chapter_response_id   uuid not null references chapter_responses(id) on delete cascade,
  trigger_definition_id uuid not null references trigger_definitions(id) on delete cascade,
  fired_at              timestamptz not null default now()
);
alter table trigger_events enable row level security;
do $$ begin
  create policy "te_select" on trigger_events for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "te_insert" on trigger_events for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "te_delete" on trigger_events for delete using (true);
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. Voice Recordings — audio captures per chapter response
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists voice_recordings (
  id                  uuid primary key default gen_random_uuid(),
  chapter_response_id uuid not null references chapter_responses(id) on delete cascade,
  storage_path        text not null,
  duration_ms         int,
  created_at          timestamptz not null default now()
);
alter table voice_recordings enable row level security;
do $$ begin
  create policy "vr_select" on voice_recordings for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "vr_insert" on voice_recordings for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "vr_delete" on voice_recordings for delete using (true);
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 14. Studies: add voice recording opt-in flag
-- ─────────────────────────────────────────────────────────────────────────────
alter table studies add column if not exists enable_voice_recording boolean default false;

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTE: Create a Supabase Storage bucket named "voice-recordings"
--   - public: false
--   - insert policy: allow all (anon + authenticated)
-- ─────────────────────────────────────────────────────────────────────────────

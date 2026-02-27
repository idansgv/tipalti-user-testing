-- ─────────────────────────────────────────────────────────────────────────────
-- Tipalti UX Research Tool — Supabase schema
-- Run this once in: Supabase Dashboard → SQL Editor → Run
-- Creates tables, indexes, RLS policies, and views
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Extensions ────────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ── 1. Studies ────────────────────────────────────────────────────────────────
create table if not exists studies (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  description         text,
  thank_you_msg       text not null default 'Thank you for your time!',
  redirect_url        text,
  chapter_count       int  not null default 1,
  is_active           bool not null default true,
  is_archived         boolean default false,
  invite_expires_at   timestamptz,
  max_responses       int,
  created_at          timestamptz not null default now()
);

-- ── 2. Chapters ───────────────────────────────────────────────────────────────
create table if not exists chapters (
  id              uuid primary key default gen_random_uuid(),
  study_id        uuid not null references studies(id) on delete cascade,
  position        int  not null,
  title           text not null default '',
  task_text       text not null default '',
  figma_url       text,
  is_figma_make   boolean default false,
  transition_desc text,
  unique (study_id, position)
);

-- ── 3. Survey questions ───────────────────────────────────────────────────────
create table if not exists survey_questions (
  id          uuid primary key default gen_random_uuid(),
  chapter_id  uuid not null references chapters(id) on delete cascade,
  position    int  not null,
  kind        text not null check (kind in ('rating','text','opinion_scale','multiple_choice','yes_no','nps')),
  prompt      text not null,
  options     jsonb,
  scale_labels jsonb,
  unique (chapter_id, position)
);

-- ── 4. Screener questions ─────────────────────────────────────────────────────
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

-- ── 5. Sessions ───────────────────────────────────────────────────────────────
create table if not exists sessions (
  id               uuid primary key default gen_random_uuid(),
  study_id         uuid not null references studies(id) on delete cascade,
  participant_ref  text,
  screener_answers jsonb,
  created_at       timestamptz not null default now(),
  completed_at     timestamptz
);

-- ── 6. Chapter responses ──────────────────────────────────────────────────────
create table if not exists chapter_responses (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references sessions(id) on delete cascade,
  chapter_id   uuid not null references chapters(id) on delete cascade,
  created_at   timestamptz not null default now(),
  completed_at timestamptz,
  outcome      text check (outcome in ('completed', 'gave_up')),
  duration_ms  int
);

-- ── 7. Survey answers ─────────────────────────────────────────────────────────
create table if not exists survey_answers (
  id                   uuid primary key default gen_random_uuid(),
  chapter_response_id  uuid not null references chapter_responses(id) on delete cascade,
  question_id          uuid not null references survey_questions(id) on delete cascade,
  rating_value         int  check (rating_value between 1 and 5),
  text_value           text,
  opinion_value        int  check (opinion_value between 1 and 10),
  nps_value            int  check (nps_value between 0 and 10),
  choice_value         text,
  bool_value           boolean
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists idx_chapters_study       on chapters(study_id);
create index if not exists idx_sq_chapter           on survey_questions(chapter_id);
create index if not exists idx_screener_study       on screener_questions(study_id);
create index if not exists idx_sessions_study       on sessions(study_id);
create index if not exists idx_cr_session           on chapter_responses(session_id);
create index if not exists idx_cr_chapter           on chapter_responses(chapter_id);
create index if not exists idx_answers_cr           on survey_answers(chapter_response_id);
create index if not exists idx_answers_question     on survey_answers(question_id);

-- ── Views ─────────────────────────────────────────────────────────────────────

-- study_summary: used by AdminDashboard
create or replace view study_summary as
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

-- chapter_stats: used by StudyResults per-chapter metrics
create or replace view chapter_stats as
select
  ch.study_id,
  ch.id           as chapter_id,
  ch.position,
  ch.title,
  count(cr.id)::int                                                                    as attempts,
  count(cr.id) filter (where cr.outcome = 'completed')::int                           as completions,
  count(cr.id) filter (where cr.outcome = 'gave_up')::int                             as gave_up,
  round(avg(cr.duration_ms) filter (where cr.completed_at is not null) / 1000.0)::int as avg_duration_sec,
  case
    when count(cr.id) = 0 then 0
    else round(
      count(cr.id) filter (where cr.outcome = 'completed')::numeric
      / count(cr.id) * 100
    )
  end::int                                                                             as success_rate_pct
from chapters ch
left join chapter_responses cr on cr.chapter_id = ch.id
group by ch.study_id, ch.id, ch.position, ch.title;

-- ── RLS (Row-Level Security) ──────────────────────────────────────────────────
alter table studies              enable row level security;
alter table chapters             enable row level security;
alter table survey_questions     enable row level security;
alter table screener_questions   enable row level security;
alter table sessions             enable row level security;
alter table chapter_responses    enable row level security;
alter table survey_answers       enable row level security;

-- studies
create policy "studies_select"   on studies for select using (true);
create policy "studies_insert"   on studies for insert with check (true);
create policy "studies_update"   on studies for update using (true);
create policy "studies_delete"   on studies for delete using (true);

-- chapters
create policy "chapters_select"  on chapters for select using (true);
create policy "chapters_insert"  on chapters for insert with check (true);
create policy "chapters_update"  on chapters for update using (true);
create policy "chapters_delete"  on chapters for delete using (true);

-- survey_questions
create policy "sq_select"        on survey_questions for select using (true);
create policy "sq_insert"        on survey_questions for insert with check (true);
create policy "sq_update"        on survey_questions for update using (true);
create policy "sq_delete"        on survey_questions for delete using (true);

-- screener_questions
create policy "sq2_select"       on screener_questions for select using (true);
create policy "sq2_insert"       on screener_questions for insert with check (true);
create policy "sq2_delete"       on screener_questions for delete using (true);

-- sessions
create policy "sessions_select"  on sessions for select using (true);
create policy "sessions_insert"  on sessions for insert with check (true);
create policy "sessions_update"  on sessions for update using (true);
create policy "sessions_delete"  on sessions for delete using (true);

-- chapter_responses
create policy "cr_select"        on chapter_responses for select using (true);
create policy "cr_insert"        on chapter_responses for insert with check (true);
create policy "cr_update"        on chapter_responses for update using (true);

-- survey_answers
create policy "answers_select"   on survey_answers for select using (true);
create policy "answers_insert"   on survey_answers for insert with check (true);

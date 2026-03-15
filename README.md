# User Testing Tool

Lightweight internal user research tool — Figma prototype testing, multi-chapter studies, post-task surveys, trigger funnels, voice recording, and PPTX export.

## Stack
- **React + Vite** — frontend
- **Tailwind CSS** — styling
- **Supabase** — database, RLS, storage
- **pptxgenjs** — PPTX export
- **Vercel** — hosting (auto-deploys on push to `main`)

---

## Setup

### 1. Supabase
1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor**, paste the full contents of `schema.sql`, and run it
3. Then paste and run `migrations.sql` to apply all incremental changes
4. Create a Storage bucket named **`voice-recordings`** (private, insert allowed for anon)
5. Copy your **Project URL** and **anon public key** from Project Settings → API

### 2. Environment variables
```bash
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON, VITE_ADMIN_PASSWORD
```

### 3. Install & run
```bash
npm install
npm run dev
```

---

## Routes

### Participant
| Route | Description |
|---|---|
| `/s/:studyId` | Welcome screen |
| `/s/:studyId/screener` | Screener questions (if enabled) |
| `/s/:studyId/ch/:pos/task` | Task brief |
| `/s/:studyId/ch/:pos/prototype` | Fullscreen Figma + mission control bar |
| `/s/:studyId/ch/:pos/survey` | Post-task survey |
| `/s/:studyId/ch/:pos` | Chapter transition |
| `/s/:studyId/done` | Thank you / redirect |

### Admin
| Route | Description |
|---|---|
| `/admin` | Password login |
| `/admin/dashboard` | All studies list |
| `/admin/studies/new` | Create a study |
| `/admin/studies/:studyId` | Results dashboard |
| `/admin/studies/:studyId/edit` | Edit a study |

---

## Features

### Study Builder
- Up to 5 tasks (chapters) per study
- Per-task Figma URL or a shared default URL
- **Figma Make** flag — renders the URL in a plain iframe (no embed wrapping)
- Post-task survey questions: `rating`, `text`, `opinion_scale`, `multiple_choice`, `yes_no`, `nps`
- Screener questions shown before the study starts
- Voice recording opt-in (per study)
- Triggers (see below)
- Edit mode: keep or discard existing response data when saving changes

### Triggers
Named checkpoints that fire when a participant reaches a specific point in the prototype.

**Regular Figma** — fires when the participant navigates to a matching frame name (via Figma's `PRESENTED_DESIGN_NAVIGATION` postMessage).

**Figma Make** — fires when the prototype calls:
```js
window.parent.postMessage({ type: 'UT_TRIGGER', name: 'Event Name' }, '*')
```

Each trigger has an optional **action**:
- `none` (default) — silently records the event
- `complete` — records the event, shows a 1.5s "Task complete" overlay, then automatically finishes the task and advances the participant to the survey

Trigger event counts are shown as a funnel chart in the Results dashboard.

### Voice Recording
When enabled, the participant's microphone is recorded for each task. Recordings are uploaded to Supabase Storage (`voice-recordings` bucket) and playable from the Results dashboard per session.

### Results Dashboard
- Completion rate, participant count, median/fastest/slowest duration
- Per-chapter stats: completion rate, outcome breakdown, average duration
- Trigger funnel chart
- Per-session detail: screener answers, survey responses, voice playback
- PPTX export covering all question types and the trigger funnel

---

## Database schema (key tables)

| Table | Description |
|---|---|
| `studies` | Study metadata, settings |
| `chapters` | Tasks within a study |
| `survey_questions` | Post-task questions per chapter |
| `screener_questions` | Pre-study screener per study |
| `sessions` | One row per participant run |
| `chapter_responses` | One row per task per participant |
| `survey_answers` | Individual question answers |
| `trigger_definitions` | Named trigger checkpoints per chapter |
| `trigger_events` | Fired trigger instances per chapter response |
| `voice_recordings` | Audio recording metadata per chapter response |

Views: `study_summary`, `chapter_stats`

---

## Deployment

The app auto-deploys to Vercel on every push to `main`. To deploy manually:
```bash
npm run build
# then push to main, or deploy via Vercel dashboard
```

Set these environment variables in the Vercel project settings:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON`
- `VITE_ADMIN_PASSWORD`

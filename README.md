# User Testing Tool

Lightweight internal user research tool — Figma prototype testing, multi-chapter studies, click heatmaps, AI-summarized feedback.

## Stack
- **React + Vite** — frontend
- **Tailwind CSS** — styling
- **Supabase** — database, auth, RLS
- **Claude API** — AI summaries of participant responses
- **Vercel** — hosting

---

## Setup

### 1. Supabase
1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and paste the full contents of `schema.sql`
3. Run it — this creates all 7 tables, indexes, RLS policies, and 2 views
4. Copy your **Project URL** and **anon public key** from Project Settings → API

### 2. Environment variables
```bash
cp .env.example .env.local
# Fill in your Supabase URL, anon key, and admin password
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
| `/s/:studyId/ch/:pos/task` | Task brief |
| `/s/:studyId/ch/:pos/prototype` | Fullscreen Figma + mission control |
| `/s/:studyId/ch/:pos/survey` | Post-task survey |
| `/s/:studyId/ch/:pos` | Chapter transition |
| `/s/:studyId/done` | Thank you |

### Admin
| Route | Description |
|---|---|
| `/admin` | Password login |
| `/admin/dashboard` | All studies list |
| `/admin/studies/new` | Create a study |
| `/admin/studies/:studyId` | Results + heatmap + AI summary |

---

## Sharing a study with participants
1. Create a study at `/admin/studies/new`
2. Copy the participant link from the results page: `https://yourdomain.com/s/:studyId`
3. Send it to participants — no login required on their end

---

## Deploy to Vercel
```bash
npm i -g vercel
vercel
# Set environment variables in Vercel dashboard
```

---

## Phase roadmap
- [x] Phase 1 — Scaffold, routing, Supabase schema
- [x] Phase 2 — Full participant flow (all 5 screen types)
- [x] Phase 3 — Admin: login, dashboard, study builder, results
- [ ] Phase 4 — PPTX export

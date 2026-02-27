import { createClient } from '@supabase/supabase-js'

// ─── Replace these with your actual Supabase project values ───────────────────
// You can find them in: Supabase Dashboard → Project Settings → API
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  || 'https://YOUR_PROJECT.supabase.co'
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON || 'YOUR_ANON_KEY'
// ─────────────────────────────────────────────────────────────────────────────

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

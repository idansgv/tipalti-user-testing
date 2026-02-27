import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getStudyWithChapters, getStudyResults, getChapterStats, getTriggerResults, getVoiceRecordingUrl } from '../../lib/db'
import { exportStudyPptx } from '../../lib/exportPptx'
import { Card, Label, Loading, ErrorState, Btn, ResultBar } from '../../components/UI'

// ── AI Summary button ────────────────────────────────────────
function AISummary({ texts }) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)

  async function generate() {
    if (!texts.length) return
    setLoading(true)
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          system: 'You are a UX research analyst. Summarize user feedback concisely. Identify patterns, common pain points, and notable quotes. Use plain prose, no markdown headers.',
          messages: [{
            role: 'user',
            content: `Here are reviewer text responses from a usability research session. Summarize the key themes and insights in 3-5 sentences:\n\n${texts.map((t, i) => `${i + 1}. "${t}"`).join('\n')}`,
          }],
        }),
      })
      const data = await response.json()
      setSummary(data.content?.[0]?.text || 'Could not generate summary.')
    } catch {
      setSummary('Error generating summary — check console.')
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-3">
      {!summary && (
        <Btn onClick={generate} disabled={loading || !texts.length} variant="secondary">
          {loading ? 'Generating…' : `✦ AI Summary (${texts.length} responses)`}
        </Btn>
      )}
      {summary && (
        <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
          <Label className="mb-2 block text-accent">AI Summary</Label>
          <p className="text-sm text-text leading-relaxed">{summary}</p>
          <button
            onClick={() => setSummary(null)}
            className="text-xs text-muted hover:text-text mt-2 transition-colors font-mono"
          >
            Regenerate
          </button>
        </div>
      )}
    </div>
  )
}

// ── Question result charts ────────────────────────────────────
function QuestionResults({ question, answers }) {
  if (!answers.length) return null

  const kind = question.kind

  if (kind === 'rating') {
    const values = answers.map(a => a.rating_value).filter(v => v != null)
    if (!values.length) return null
    const avg = (values.reduce((s, v) => s + v, 0) / values.length).toFixed(1)
    return (
      <div className="flex flex-col gap-2">
        <div className="text-2xl font-mono font-semibold text-accent">{avg}<span className="text-sm text-muted"> / 5</span></div>
        <div className="flex flex-col gap-1.5">
          {[5,4,3,2,1].map(n => (
            <ResultBar key={n} label={`${n} star${n !== 1 ? 's' : ''}`} count={values.filter(v => v === n).length} total={values.length} />
          ))}
        </div>
      </div>
    )
  }

  if (kind === 'opinion_scale') {
    const values = answers.map(a => a.opinion_value).filter(v => v != null)
    if (!values.length) return null
    const max = question.scale_labels?.max ?? 7
    const avg = (values.reduce((s, v) => s + v, 0) / values.length).toFixed(1)
    const nums = Array.from({ length: max }, (_, i) => i + 1)
    return (
      <div className="flex flex-col gap-2">
        <div className="text-2xl font-mono font-semibold text-accent">{avg}<span className="text-sm text-muted"> / {max}</span></div>
        {question.scale_labels?.low && (
          <div className="flex justify-between text-[10px] text-muted font-mono">
            <span>{question.scale_labels.low}</span>
            <span>{question.scale_labels.high}</span>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          {nums.map(n => (
            <ResultBar key={n} label={String(n)} count={values.filter(v => v === n).length} total={values.length} />
          ))}
        </div>
      </div>
    )
  }

  if (kind === 'nps') {
    const values = answers.map(a => a.nps_value).filter(v => v != null)
    if (!values.length) return null
    const promoters  = values.filter(v => v >= 9).length
    const detractors = values.filter(v => v <= 6).length
    const npsScore   = Math.round((promoters / values.length - detractors / values.length) * 100)
    const nums = Array.from({ length: 11 }, (_, i) => i)
    return (
      <div className="flex flex-col gap-2">
        <div className="flex gap-4 items-end">
          <div>
            <div className="text-2xl font-mono font-semibold text-accent">{npsScore > 0 ? '+' : ''}{npsScore}</div>
            <Label>NPS Score</Label>
          </div>
          <div className="text-xs text-muted font-mono flex gap-3">
            <span className="text-warn">{detractors} detractors</span>
            <span>{values.filter(v => v >= 7 && v <= 8).length} passives</span>
            <span className="text-success">{promoters} promoters</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          {nums.map(n => (
            <ResultBar
              key={n}
              label={String(n)}
              count={values.filter(v => v === n).length}
              total={values.length}
              color={n <= 6 ? 'bg-warn' : n <= 8 ? 'bg-muted' : 'bg-success'}
            />
          ))}
        </div>
      </div>
    )
  }

  if (kind === 'yes_no') {
    const bools  = answers.map(a => a.bool_value).filter(v => v != null)
    const yesCount = bools.filter(v => v === true).length
    const noCount  = bools.filter(v => v === false).length
    if (!bools.length) return null
    return (
      <div className="flex flex-col gap-1.5">
        <ResultBar label="Yes" count={yesCount} total={bools.length} color="bg-success" />
        <ResultBar label="No"  count={noCount}  total={bools.length} color="bg-warn" />
      </div>
    )
  }

  if (kind === 'multiple_choice') {
    const choices = answers.map(a => a.choice_value).filter(v => v != null)
    if (!choices.length) return null
    const options = Array.isArray(question.options) ? question.options : []
    // include any unexpected values too
    const allOptions = [...new Set([...options, ...choices])]
    return (
      <div className="flex flex-col gap-1.5">
        {allOptions.map(opt => (
          <ResultBar key={opt} label={opt} count={choices.filter(c => c === opt).length} total={choices.length} />
        ))}
      </div>
    )
  }

  return null
}

// ── Voice Recording Player (lazy signed URL) ──────────────────
function VoicePlayer({ storagePath }) {
  const [url, setUrl]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr]       = useState(null)

  async function load() {
    if (url || loading) return
    setLoading(true)
    try {
      const signed = await getVoiceRecordingUrl(storagePath)
      setUrl(signed)
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (err) return <span className="text-xs text-warn font-mono">Audio error</span>

  if (!url) {
    return (
      <button
        onClick={load}
        disabled={loading}
        className="text-xs font-mono text-accent hover:opacity-80 transition-opacity disabled:opacity-40"
      >
        {loading ? 'Loading…' : '▶ Play recording'}
      </button>
    )
  }

  return (
    <audio
      src={url}
      controls
      className="h-7 w-full max-w-xs"
      style={{ colorScheme: 'dark' }}
    />
  )
}

// ── Trigger Funnel section ────────────────────────────────────
function TriggerFunnel({ triggerResults, chapterPos, totalSessions }) {
  const defs = triggerResults.filter(t => t.chapter_pos === chapterPos)
  if (defs.length === 0) {
    return (
      <p className="text-xs text-muted">No triggers configured for this task.</p>
    )
  }
  const total = totalSessions || 1
  return (
    <div className="flex flex-col gap-2">
      {defs.sort((a, b) => a.position - b.position).map(def => (
        <ResultBar
          key={def.trigger_definition_id}
          label={def.name}
          count={def.count}
          total={total}
        />
      ))}
    </div>
  )
}

// ── Main Results page ─────────────────────────────────────────
export default function StudyResults() {
  const { studyId } = useParams()
  const navigate    = useNavigate()

  const [study, setStudy]               = useState(null)
  const [results, setResults]           = useState([])
  const [stats, setStats]               = useState([])
  const [triggerResults, setTriggerResults] = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [activeChapter, setActiveChapter] = useState(1)
  const [exporting, setExporting]         = useState(false)
  const [activeFilter, setActiveFilter]   = useState(null)  // { qId, val } or null

  useEffect(() => {
    if (!sessionStorage.getItem('admin_authed')) navigate('/admin')
  }, [navigate])

  useEffect(() => {
    Promise.all([
      getStudyWithChapters(studyId),
      getStudyResults(studyId),
      getChapterStats(studyId),
      getTriggerResults(studyId),
    ])
      .then(([s, r, st, tr]) => { setStudy(s); setResults(r); setStats(st); setTriggerResults(tr) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [studyId])

  if (loading) return <Loading />
  if (error)   return <ErrorState message={error} />

  const totalSessions     = results.length
  const completedSessions = results.filter(s => s.completed_at).length
  const completionRate    = totalSessions
    ? Math.round((completedSessions / totalSessions) * 100)
    : 0

  // ── Screener filter chips ─────────────────────────────────────
  const screenerChipMap = new Map()
  results.forEach(s => {
    Object.entries(s.screener_answers || {}).forEach(([qId, val]) => {
      const key = `${qId}::${val}`
      if (!screenerChipMap.has(key)) screenerChipMap.set(key, { qId, val, count: 0 })
      screenerChipMap.get(key).count++
    })
  })
  const screenerChips = [...screenerChipMap.values()]

  // ── Filtered results ──────────────────────────────────────────
  const filteredResults = activeFilter
    ? results.filter(s => (s.screener_answers || {})[activeFilter.qId] == activeFilter.val)
    : results

  // Chapter stats: from DB view when no filter, computed client-side when filtered
  const chapterStat = activeFilter
    ? computeChapterStat(filteredResults, activeChapter)
    : stats.find(s => s.position === activeChapter)

  const activeChapterData = study.chapters.find(c => c.position === activeChapter)

  // Collect all answers for the active chapter (from filtered results)
  const chapterAnswers = filteredResults.flatMap(session =>
    (session.chapter_responses || [])
      .filter(cr => cr.chapters?.position === activeChapter)
      .flatMap(cr => cr.survey_answers || [])
  )

  const allTextAnswers = chapterAnswers
    .filter(a => a.text_value?.trim())
    .map(a => a.text_value)

  // Sessions for this chapter (for voice recordings + trigger counts)
  const chapterResponses = filteredResults.flatMap(session =>
    (session.chapter_responses || [])
      .filter(cr => cr.chapters?.position === activeChapter)
      .map(cr => ({ ...cr, session_id: session.id }))
  )

  // Duration stats for active chapter
  const durations = chapterResponses
    .filter(cr => cr.duration_ms)
    .map(cr => cr.duration_ms)
    .sort((a, b) => a - b)

  const medianMs  = durations.length
    ? durations[Math.floor(durations.length / 2)]
    : null
  const fastestMs = durations.length ? durations[0] : null
  const slowestMs = durations.length ? durations[durations.length - 1] : null

  const fmtSec = ms => ms != null ? `${Math.round(ms / 1000)}s` : '—'

  const participantUrl = `${window.location.origin}/s/${studyId}`

  return (
    <div className="min-h-screen bg-bg p-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="text-muted hover:text-text text-sm transition-colors mb-2 block"
            >
              ← Dashboard
            </button>
            <div className="font-mono text-[10px] tracking-widest uppercase text-accent mb-1">
              Research Session Results
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">{study.title}</h1>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => navigate(`/admin/studies/${studyId}/edit`)}
              className="text-xs font-mono text-muted border border-border rounded-md px-3 py-1.5
                hover:border-accent/40 hover:text-text transition-colors"
            >
              Edit Study
            </button>
            <button
              onClick={() => { navigator.clipboard.writeText(participantUrl) }}
              className="text-xs font-mono text-muted border border-border rounded-md px-3 py-1.5
                hover:border-accent/40 hover:text-text transition-colors"
            >
              Copy Link
            </button>
            <button
              onClick={async () => {
                setExporting(true)
                try { await exportStudyPptx(study, results, stats) }
                finally { setExporting(false) }
              }}
              disabled={exporting}
              className="text-xs font-mono text-muted border border-border rounded-md px-3 py-1.5
                hover:border-accent/40 hover:text-text transition-colors disabled:opacity-40"
            >
              {exporting ? 'Exporting…' : 'Export PPTX'}
            </button>
          </div>
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Participants', value: totalSessions },
            { label: 'Completed', value: completedSessions },
            { label: 'Completion Rate', value: `${completionRate}%`, accent: true },
            { label: 'Tasks', value: study.chapter_count },
          ].map(s => (
            <Card key={s.label} className="text-center py-4">
              <div className={`text-2xl font-semibold font-mono ${s.accent ? 'text-accent' : 'text-text'}`}>
                {s.value}
              </div>
              <Label className="mt-1">{s.label}</Label>
            </Card>
          ))}
        </div>

        {/* Screener filter chips */}
        {screenerChips.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            <Label className="self-center">Filter by screener:</Label>
            {activeFilter && (
              <button
                onClick={() => setActiveFilter(null)}
                className="px-2 py-1 rounded-full text-[10px] font-mono bg-muted/20 text-muted hover:bg-muted/30 transition-colors"
              >
                ✕ Clear filter
              </button>
            )}
            {screenerChips.map(chip => {
              const isActive = activeFilter?.qId === chip.qId && activeFilter?.val == chip.val
              return (
                <button
                  key={`${chip.qId}::${chip.val}`}
                  onClick={() => setActiveFilter(isActive ? null : { qId: chip.qId, val: chip.val })}
                  className={`px-3 py-1 rounded-full text-[10px] font-mono transition-all
                    ${isActive
                      ? 'bg-accent text-[#0A1628]'
                      : 'bg-border/50 text-muted hover:bg-border hover:text-text border border-border'
                    }`}
                >
                  {String(chip.val)} <span className="opacity-60">({chip.count})</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Task tabs */}
        <div className="inline-flex items-center bg-border/70 rounded-lg p-0.5 mb-4">
          {study.chapters.map(ch => (
            <button
              key={ch.position}
              onClick={() => setActiveChapter(ch.position)}
              className={`px-4 py-1.5 rounded-md text-xs font-mono transition-all
                ${activeChapter === ch.position
                  ? 'bg-surface text-text font-semibold shadow-[0_1px_4px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.07)]'
                  : 'text-muted hover:text-text font-medium'
                }`}
            >
              Task {ch.position}
            </button>
          ))}
        </div>

        {/* Chapter detail */}
        {activeChapterData && (
          <div className="flex flex-col gap-4">

            {/* Chapter stats row */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Attempts', value: chapterStat?.attempts ?? 0 },
                { label: 'Completed', value: chapterStat?.completions ?? 0 },
                { label: 'Gave Up', value: chapterStat?.gave_up ?? 0 },
                { label: 'Avg Time', value: chapterStat?.avg_duration_sec ? `${chapterStat.avg_duration_sec}s` : '—' },
              ].map(s => (
                <Card key={s.label} className="text-center py-3">
                  <div className="text-xl font-semibold font-mono text-text">{s.value}</div>
                  <Label className="mt-0.5">{s.label}</Label>
                </Card>
              ))}
            </div>

            {/* Duration detail row (median / fastest / slowest) */}
            {durations.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Median Time', value: fmtSec(medianMs) },
                  { label: 'Fastest', value: fmtSec(fastestMs) },
                  { label: 'Slowest', value: fmtSec(slowestMs) },
                ].map(s => (
                  <Card key={s.label} className="text-center py-2.5">
                    <div className="text-base font-semibold font-mono text-muted">{s.value}</div>
                    <Label className="mt-0.5">{s.label}</Label>
                  </Card>
                ))}
              </div>
            )}

            {/* Success rate bar */}
            {chapterStat && (
              <Card>
                <div className="flex items-center justify-between mb-2">
                  <Label>Task Success Rate</Label>
                  <span className="font-mono text-sm text-accent">
                    {chapterStat.success_rate_pct ?? 0}%
                  </span>
                </div>
                <div className="h-2 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${chapterStat.success_rate_pct ?? 0}%` }}
                  />
                </div>
              </Card>
            )}

            {/* Trigger Funnel */}
            <Card>
              <Label className="mb-3 block">Trigger Funnel</Label>
              <TriggerFunnel
                triggerResults={triggerResults}
                chapterPos={activeChapter}
                totalSessions={chapterResponses.length}
              />
            </Card>

            {/* Survey question results */}
            {activeChapterData.survey_questions.filter(q => q.kind !== 'text').length > 0 && (
              <Card>
                <Label className="mb-4 block">Question Results</Label>
                <div className="flex flex-col gap-6">
                  {activeChapterData.survey_questions
                    .filter(q => q.kind !== 'text')
                    .map(q => {
                      const qAnswers = chapterAnswers.filter(a => a.question_id === q.id)
                      return (
                        <div key={q.id}>
                          <p className="text-xs text-text mb-2 font-medium">{q.prompt}</p>
                          <QuestionResults question={q} answers={qAnswers} />
                        </div>
                      )
                    })
                  }
                </div>
              </Card>
            )}

            {/* AI Summary + text responses */}
            <Card>
              <Label className="mb-3 block">Text Responses</Label>
              <AISummary texts={allTextAnswers} />
              {allTextAnswers.length > 0 && (
                <div className="flex flex-col gap-2 mt-4">
                  {allTextAnswers.map((text, i) => (
                    <div key={i} className="bg-bg border border-border rounded-lg px-4 py-3">
                      <p className="text-sm text-text leading-relaxed">{text}</p>
                    </div>
                  ))}
                </div>
              )}
              {allTextAnswers.length === 0 && (
                <p className="text-xs text-muted">No text responses yet.</p>
              )}
            </Card>

            {/* Voice Recordings (per session) */}
            {study.enable_voice_recording && (
              <Card>
                <Label className="mb-3 block">Session Recordings</Label>
                {chapterResponses.filter(cr => cr.voice_recordings?.length > 0).length === 0 ? (
                  <p className="text-xs text-muted">No recordings collected yet.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {chapterResponses
                      .filter(cr => cr.voice_recordings?.length > 0)
                      .map((cr, i) => (
                        <div key={cr.id} className="flex items-center gap-3 bg-bg border border-border rounded-lg px-4 py-2.5">
                          <span className="font-mono text-[10px] text-muted flex-shrink-0">
                            Session {i + 1}
                          </span>
                          <span className="text-xs text-muted font-mono capitalize flex-shrink-0">
                            {cr.outcome}
                          </span>
                          <div className="flex-1">
                            <VoicePlayer storagePath={cr.voice_recordings[0].storage_path} />
                          </div>
                          {cr.voice_recordings[0].duration_ms && (
                            <span className="text-[10px] text-muted font-mono flex-shrink-0">
                              {fmtSec(cr.voice_recordings[0].duration_ms)}
                            </span>
                          )}
                        </div>
                      ))
                    }
                  </div>
                )}
              </Card>
            )}

          </div>
        )}

      </div>
    </div>
  )
}

// ── Client-side chapter stat computation (for filtered results) ─
function computeChapterStat(filteredResults, chapterPos) {
  const responses = filteredResults.flatMap(s =>
    (s.chapter_responses || []).filter(cr => cr.chapters?.position === chapterPos)
  )
  const attempts    = responses.length
  const completions = responses.filter(cr => cr.outcome === 'completed').length
  const gave_up     = responses.filter(cr => cr.outcome === 'gave_up').length
  const durations   = responses
    .filter(cr => cr.completed_at && cr.duration_ms)
    .map(cr => cr.duration_ms)
  const avg_duration_sec = durations.length
    ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length / 1000)
    : null
  const success_rate_pct = attempts > 0
    ? Math.round((completions / attempts) * 100)
    : 0
  return { attempts, completions, gave_up, avg_duration_sec, success_rate_pct }
}

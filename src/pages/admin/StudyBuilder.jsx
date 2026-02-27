import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getStudyForEdit, getSessionCount, saveTriggerDefinitions } from '../../lib/db'
import { Card, Label, Btn, Loading } from '../../components/UI'

// ── Study templates ───────────────────────────────────────────
const TEMPLATES = [
  {
    id: 'supplier-portal',
    name: 'Supplier Portal — Onboarding',
    description: '3 tasks, SEQ + open text per task',
    chapters: [
      {
        position: 1, title: 'Create Supplier Account', task_text: 'Navigate to the supplier portal and complete the account registration process.', figma_url: '', transition_desc: 'Great! Now let\'s try submitting a document.',
        survey_questions: [
          { kind: 'opinion_scale', prompt: 'How easy was it to complete this task? (1 = very difficult, 7 = very easy)', position: 1, scale_labels: { max: 7, low: 'Very difficult', high: 'Very easy' } },
          { kind: 'text', prompt: 'What, if anything, was confusing or unclear during this task?', position: 2 },
        ],
      },
      {
        position: 2, title: 'Submit Compliance Document', task_text: 'Upload a required compliance document and submit it for review.', figma_url: '', transition_desc: 'Almost done — one more task.',
        survey_questions: [
          { kind: 'opinion_scale', prompt: 'How easy was it to complete this task? (1 = very difficult, 7 = very easy)', position: 1, scale_labels: { max: 7, low: 'Very difficult', high: 'Very easy' } },
          { kind: 'text', prompt: 'What would you improve about this step?', position: 2 },
        ],
      },
      {
        position: 3, title: 'View Payment Status', task_text: 'Find the payment status for your most recent invoice.', figma_url: '', transition_desc: '',
        survey_questions: [
          { kind: 'opinion_scale', prompt: 'How easy was it to complete this task? (1 = very difficult, 7 = very easy)', position: 1, scale_labels: { max: 7, low: 'Very difficult', high: 'Very easy' } },
          { kind: 'text', prompt: 'Any other feedback about this task?', position: 2 },
        ],
      },
    ],
  },
  {
    id: 'payment-approval',
    name: 'Payment Approval Flow',
    description: '2 tasks, SEQ + yes/no + open text per task',
    chapters: [
      {
        position: 1, title: 'Review Pending Payments', task_text: 'Review the list of pending payments and identify any that require immediate attention.', figma_url: '', transition_desc: 'Good work! One more task to go.',
        survey_questions: [
          { kind: 'opinion_scale', prompt: 'How easy was it to find the information you needed? (1 = very difficult, 7 = very easy)', position: 1, scale_labels: { max: 7, low: 'Very difficult', high: 'Very easy' } },
          { kind: 'yes_no', prompt: 'Did you find all the information you needed to make a decision?', position: 2 },
          { kind: 'text', prompt: 'What information was missing or hard to find?', position: 3 },
        ],
      },
      {
        position: 2, title: 'Approve a Payment Batch', task_text: 'Select and approve a batch of payments for processing.', figma_url: '', transition_desc: '',
        survey_questions: [
          { kind: 'opinion_scale', prompt: 'How easy was it to complete this task? (1 = very difficult, 7 = very easy)', position: 1, scale_labels: { max: 7, low: 'Very difficult', high: 'Very easy' } },
          { kind: 'yes_no', prompt: 'Would you feel confident approving payments using this interface in a real scenario?', position: 2 },
          { kind: 'text', prompt: 'What concerns, if any, do you have about this flow?', position: 3 },
        ],
      },
    ],
  },
  {
    id: 'sus',
    name: 'SUS — System Usability Scale',
    description: '1 task, 10 SUS opinion_scale questions',
    chapters: [
      {
        position: 1, title: 'Explore the System', task_text: 'Spend a few minutes exploring the system as you normally would.', figma_url: '', transition_desc: '',
        survey_questions: [
          { kind: 'opinion_scale', prompt: 'I think that I would like to use this system frequently.', position: 1, scale_labels: { max: 5, low: 'Strongly disagree', high: 'Strongly agree' } },
          { kind: 'opinion_scale', prompt: 'I found the system unnecessarily complex.', position: 2, scale_labels: { max: 5, low: 'Strongly disagree', high: 'Strongly agree' } },
          { kind: 'opinion_scale', prompt: 'I thought the system was easy to use.', position: 3, scale_labels: { max: 5, low: 'Strongly disagree', high: 'Strongly agree' } },
          { kind: 'opinion_scale', prompt: 'I think that I would need the support of a technical person to be able to use this system.', position: 4, scale_labels: { max: 5, low: 'Strongly disagree', high: 'Strongly agree' } },
          { kind: 'opinion_scale', prompt: 'I found the various functions in this system were well integrated.', position: 5, scale_labels: { max: 5, low: 'Strongly disagree', high: 'Strongly agree' } },
          { kind: 'opinion_scale', prompt: 'I thought there was too much inconsistency in this system.', position: 6, scale_labels: { max: 5, low: 'Strongly disagree', high: 'Strongly agree' } },
          { kind: 'opinion_scale', prompt: 'I would imagine that most people would learn to use this system very quickly.', position: 7, scale_labels: { max: 5, low: 'Strongly disagree', high: 'Strongly agree' } },
          { kind: 'opinion_scale', prompt: 'I found the system very cumbersome to use.', position: 8, scale_labels: { max: 5, low: 'Strongly disagree', high: 'Strongly agree' } },
          { kind: 'opinion_scale', prompt: 'I felt very confident using the system.', position: 9, scale_labels: { max: 5, low: 'Strongly disagree', high: 'Strongly agree' } },
          { kind: 'opinion_scale', prompt: 'I needed to learn a lot of things before I could get going with this system.', position: 10, scale_labels: { max: 5, low: 'Strongly disagree', high: 'Strongly agree' } },
        ],
      },
    ],
  },
  {
    id: 'blank',
    name: 'Blank',
    description: 'Start from scratch',
    chapters: [
      { position: 1, title: '', task_text: '', figma_url: '', transition_desc: '', survey_questions: [] },
    ],
  },
]

// ── Helpers ───────────────────────────────────────────────────
function emptyChapter(pos) {
  return {
    id: null,
    position: pos,
    title: '',
    task_text: '',
    figma_url: '',
    is_figma_make: false,
    transition_desc: '',
    survey_questions: [],
    triggers: [],
  }
}

function parseOptions(raw) {
  if (!raw) return null
  if (Array.isArray(raw)) return raw
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}

// ── Save modal ────────────────────────────────────────────────
function SaveModal({ sessionCount, canKeepData, keepDataBlockReason, saving, onKeep, onDiscard, onCancel }) {
  if (sessionCount === 0) {
    // No data — just confirm save
    return (
      <ModalShell onCancel={onCancel}>
        <p className="text-sm text-text">No responses have been collected yet.</p>
        <Btn onClick={onKeep} disabled={saving} className="w-full mt-4">
          {saving ? 'Saving…' : 'Save Changes →'}
        </Btn>
      </ModalShell>
    )
  }

  return (
    <ModalShell onCancel={onCancel}>
      <p className="text-sm text-text mb-4">
        This study has{' '}
        <span className="text-accent font-semibold">{sessionCount} response{sessionCount !== 1 ? 's' : ''}</span>{' '}
        collected. What should happen to the existing data?
      </p>

      <div className="flex flex-col gap-3">
        {/* Keep data */}
        <button
          onClick={onKeep}
          disabled={saving || !canKeepData}
          className={`text-left border rounded-xl p-4 transition-all flex flex-col gap-1
            ${canKeepData
              ? 'border-border hover:border-accent/50 hover:bg-accent/5'
              : 'border-border opacity-40 cursor-not-allowed'
            }`}
        >
          <span className="text-sm font-semibold text-text">Keep existing data</span>
          <span className="text-xs text-muted leading-relaxed">
            {canKeepData
              ? 'Existing responses are preserved. Changes to task content and questions are applied in place.'
              : keepDataBlockReason}
          </span>
        </button>

        {/* Discard data */}
        <button
          onClick={onDiscard}
          disabled={saving}
          className="text-left border border-warn/30 bg-warn/5 rounded-xl p-4 transition-all
            flex flex-col gap-1 hover:bg-warn/10 disabled:opacity-40"
        >
          <span className="text-sm font-semibold text-warn">Discard all data</span>
          <span className="text-xs text-muted leading-relaxed">
            All {sessionCount} response{sessionCount !== 1 ? 's' : ''} will be permanently deleted.
            The study will be rebuilt from scratch.
          </span>
        </button>
      </div>
    </ModalShell>
  )
}

function ModalShell({ children, onCancel }) {
  return (
    <div className="fixed inset-0 bg-bg/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
      <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-sm flex flex-col gap-1">
        <div className="flex items-center justify-between mb-3">
          <Label>Save Changes</Label>
          <button onClick={onCancel} className="text-muted hover:text-text text-sm transition-colors">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────
export default function StudyBuilder() {
  const navigate = useNavigate()
  const { studyId } = useParams()           // set when editing, undefined for new
  const isEdit = !!studyId

  const [step, setStep] = useState(isEdit ? 1 : 0)  // skip template picker in edit mode
  const [loadingEdit, setLoadingEdit] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  // Form state
  const [title, setTitle]       = useState('')
  const [description, setDesc]  = useState('')
  const [thankYou, setThankYou] = useState('Thank you for your time!')
  const [redirect, setRedirect] = useState('')
  const [defaultFigma, setDefaultFigma] = useState('')
  const [chapters, setChapters] = useState([emptyChapter(1)])
  const [useScreener, setUseScreener]           = useState(false)
  const [screenerQuestions, setScreenerQuestions] = useState([])
  const [enableVoiceRecording, setEnableVoiceRecording] = useState(false)

  // Edit mode tracking
  const [originalChapters, setOriginalChapters] = useState([])

  // Save modal state
  const [showModal, setShowModal]           = useState(false)
  const [sessionCount, setSessionCount]     = useState(0)
  const [canKeepData, setCanKeepData]       = useState(true)
  const [keepDataBlockReason, setKeepDataBlockReason] = useState('')

  // ── Load existing study in edit mode ──────────────────────────
  useEffect(() => {
    if (!isEdit) return
    async function load() {
      try {
        const s = await getStudyForEdit(studyId)
        setTitle(s.title)
        setDesc(s.description || '')
        setThankYou(s.thank_you_msg)
        setRedirect(s.redirect_url || '')
        setEnableVoiceRecording(s.enable_voice_recording || false)
        setChapters(s.chapters.map(ch => ({
          id: ch.id,
          position: ch.position,
          title: ch.title,
          task_text: ch.task_text,
          figma_url: ch.figma_url || '',
          is_figma_make: ch.is_figma_make || false,
          transition_desc: ch.transition_desc || '',
          survey_questions: ch.survey_questions.map(q => ({
            id: q.id,
            kind: q.kind,
            prompt: q.prompt,
            options: Array.isArray(q.options) ? q.options.join(', ') : (q.options || ''),
            scale_labels: q.scale_labels || null,
            position: q.position,
          })),
          triggers: (ch.trigger_definitions || []).map(t => ({
            id: t.id,
            name: t.name,
            frame_name: t.frame_name,
          })),
        })))
        setOriginalChapters(s.chapters)
        if (s.screener_questions.length > 0) {
          setUseScreener(true)
          setScreenerQuestions(s.screener_questions.map(q => ({
            id: q.id,
            kind: q.kind,
            prompt: q.prompt,
            options: Array.isArray(q.options) ? q.options.join(', ') : (q.options || ''),
            position: q.position,
          })))
        }
      } catch (e) {
        setError(e.message)
      } finally {
        setLoadingEdit(false)
      }
    }
    load()
  }, [studyId, isEdit])

  // ── Form helpers ──────────────────────────────────────────────
  function applyTemplate(tpl) {
    setChapters(tpl.chapters.map(ch => ({
      id: null,
      ...ch,
      survey_questions: (ch.survey_questions || []).map((q, i) => ({ ...q, id: null, position: i + 1 })),
      triggers: [],
    })))
    setStep(1)
  }

  function addChapter() {
    if (chapters.length >= 5) return
    setChapters(prev => [...prev, emptyChapter(prev.length + 1)])
  }

  function removeChapter(pos) {
    setChapters(prev =>
      prev.filter(c => c.position !== pos)
          .map((c, i) => ({ ...c, position: i + 1 }))
    )
  }

  function updateChapter(pos, key, value) {
    setChapters(prev =>
      prev.map(c => c.position === pos ? { ...c, [key]: value } : c)
    )
  }

  function updateQuestion(chapterPos, qIdx, key, value) {
    setChapters(prev =>
      prev.map(c => {
        if (c.position !== chapterPos) return c
        const qs = [...c.survey_questions]
        qs[qIdx] = { ...qs[qIdx], [key]: value }
        return { ...c, survey_questions: qs }
      })
    )
  }

  function addQuestion(chapterPos) {
    setChapters(prev =>
      prev.map(c => {
        if (c.position !== chapterPos) return c
        const qs = [...c.survey_questions, { id: null, kind: 'text', prompt: '', position: c.survey_questions.length + 1 }]
        return { ...c, survey_questions: qs }
      })
    )
  }

  function removeQuestion(chapterPos, qIdx) {
    setChapters(prev =>
      prev.map(c => {
        if (c.position !== chapterPos) return c
        const qs = c.survey_questions.filter((_, i) => i !== qIdx)
          .map((q, i) => ({ ...q, position: i + 1 }))
        return { ...c, survey_questions: qs }
      })
    )
  }

  // ── Trigger helpers ───────────────────────────────────────────
  function addTrigger(chapterPos) {
    setChapters(prev =>
      prev.map(c => {
        if (c.position !== chapterPos) return c
        if ((c.triggers || []).length >= 8) return c
        return { ...c, triggers: [...(c.triggers || []), { id: null, name: '', frame_name: '' }] }
      })
    )
  }

  function updateTrigger(chapterPos, tIdx, key, value) {
    setChapters(prev =>
      prev.map(c => {
        if (c.position !== chapterPos) return c
        const ts = [...(c.triggers || [])]
        ts[tIdx] = { ...ts[tIdx], [key]: value }
        return { ...c, triggers: ts }
      })
    )
  }

  function removeTrigger(chapterPos, tIdx) {
    setChapters(prev =>
      prev.map(c => {
        if (c.position !== chapterPos) return c
        return { ...c, triggers: (c.triggers || []).filter((_, i) => i !== tIdx) }
      })
    )
  }

  // ── Screener helpers ──────────────────────────────────────────
  function addScreenerQuestion() {
    setScreenerQuestions(prev => [
      ...prev,
      { id: null, kind: 'text', prompt: '', options: '', position: prev.length + 1 },
    ])
  }

  function updateScreenerQuestion(idx, key, value) {
    setScreenerQuestions(prev =>
      prev.map((q, i) => i === idx ? { ...q, [key]: value } : q)
    )
  }

  function removeScreenerQuestion(idx) {
    setScreenerQuestions(prev =>
      prev.filter((_, i) => i !== idx).map((q, i) => ({ ...q, position: i + 1 }))
    )
  }

  // ── Open save modal (with pre-checks for edit mode) ───────────
  async function openSaveModal() {
    if (!title.trim()) { setError('Study title is required'); return }
    setError(null)

    if (!isEdit) {
      // Create flow: no modal needed
      await doCreate()
      return
    }

    // Edit flow: check session count + removed chapters
    const count = await getSessionCount(studyId).catch(() => 0)
    setSessionCount(count)

    if (count > 0) {
      const keepChIds = new Set(chapters.filter(c => c.id).map(c => c.id))
      const removedIds = originalChapters.map(c => c.id).filter(id => !keepChIds.has(id))

      let blocked = false
      for (const chId of removedIds) {
        const { count: crCount } = await supabase
          .from('chapter_responses')
          .select('*', { count: 'exact', head: true })
          .eq('chapter_id', chId)
        if (crCount > 0) { blocked = true; break }
      }

      setCanKeepData(!blocked)
      setKeepDataBlockReason(blocked
        ? 'Not available — you removed tasks that have collected responses. Use "Discard all data" to apply structural changes, or add the tasks back.'
        : ''
      )
    }

    setShowModal(true)
  }

  // ── Create (new study) ─────────────────────────────────────────
  async function doCreate() {
    setSaving(true); setError(null)
    try {
      const { data: study, error: sErr } = await supabase
        .from('studies')
        .insert({
          title:                  title.trim(),
          description:            description.trim() || null,
          thank_you_msg:          thankYou.trim(),
          redirect_url:           redirect.trim() || null,
          chapter_count:          chapters.length,
          enable_voice_recording: enableVoiceRecording,
        })
        .select().single()
      if (sErr) throw sErr

      await insertChaptersAndQuestions(study.id, chapters)
      await insertScreenerQuestions(study.id)

      navigate(`/admin/studies/${study.id}`)
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  // ── Keep data save ─────────────────────────────────────────────
  async function handleKeepData() {
    setSaving(true); setError(null)
    try {
      // 1. UPDATE study record
      const { error: sErr } = await supabase
        .from('studies')
        .update({
          title:                  title.trim(),
          description:            description.trim() || null,
          thank_you_msg:          thankYou.trim(),
          redirect_url:           redirect.trim() || null,
          chapter_count:          chapters.length,
          enable_voice_recording: enableVoiceRecording,
        })
        .eq('id', studyId)
      if (sErr) throw sErr

      // 2. Handle chapters
      const keepChIds = new Set(chapters.filter(c => c.id).map(c => c.id))
      const removedChIds = originalChapters.map(c => c.id).filter(id => !keepChIds.has(id))

      // Delete removed chapters that have no responses (checked earlier — safe)
      for (const chId of removedChIds) {
        await supabase.from('chapters').delete().eq('id', chId)
      }

      // Update / insert chapters
      for (const ch of chapters) {
        const chData = {
          position:        ch.position,
          title:           ch.title.trim(),
          task_text:       ch.task_text.trim(),
          figma_url:       ch.figma_url.trim() || defaultFigma.trim() || null,
          is_figma_make:   ch.is_figma_make ?? false,
          transition_desc: ch.transition_desc.trim() || null,
        }

        let chapterId = ch.id
        if (ch.id) {
          const { error: cErr } = await supabase.from('chapters').update(chData).eq('id', ch.id)
          if (cErr) throw cErr
        } else {
          const { data: newCh, error: cErr } = await supabase
            .from('chapters')
            .insert({ study_id: studyId, ...chData })
            .select().single()
          if (cErr) throw cErr
          chapterId = newCh.id
        }

        // Handle survey questions for this chapter
        const origCh = originalChapters.find(oc => oc.id === ch.id)
        const keepQIds = new Set(ch.survey_questions.filter(q => q.id).map(q => q.id))
        const removedQIds = (origCh?.survey_questions || []).map(q => q.id).filter(id => !keepQIds.has(id))

        // Delete removed questions (cascade removes their answers)
        for (const qId of removedQIds) {
          await supabase.from('survey_questions').delete().eq('id', qId)
        }

        for (const q of ch.survey_questions) {
          if (!q.prompt?.trim()) continue
          const qData = {
            position:     q.position,
            kind:         q.kind,
            prompt:       q.prompt.trim(),
            options:      q.kind === 'multiple_choice' ? parseOptions(q.options) : null,
            scale_labels: q.kind === 'opinion_scale'   ? (q.scale_labels || null) : null,
          }
          if (q.id) {
            await supabase.from('survey_questions').update(qData).eq('id', q.id)
          } else {
            await supabase.from('survey_questions').insert({ chapter_id: chapterId, ...qData })
          }
        }

        // Upsert triggers (replace all)
        const validTriggers = (ch.triggers || []).filter(t => t.name?.trim() && t.frame_name?.trim())
        await saveTriggerDefinitions(chapterId, validTriggers)
      }

      // 3. Screener: DELETE all + re-INSERT
      await supabase.from('screener_questions').delete().eq('study_id', studyId)
      await insertScreenerQuestions(studyId)

      navigate(`/admin/studies/${studyId}`)
    } catch (e) {
      setError(e.message)
      setSaving(false)
      setShowModal(false)
    }
  }

  // ── Discard data save ──────────────────────────────────────────
  async function handleDiscardData() {
    setSaving(true); setError(null)
    try {
      // Wipe all collected data
      await supabase.from('sessions').delete().eq('study_id', studyId)
      await supabase.from('chapters').delete().eq('study_id', studyId)
      await supabase.from('screener_questions').delete().eq('study_id', studyId)

      // UPDATE study record (also reopen if it was closed)
      const { error: sErr } = await supabase
        .from('studies')
        .update({
          title:                  title.trim(),
          description:            description.trim() || null,
          thank_you_msg:          thankYou.trim(),
          redirect_url:           redirect.trim() || null,
          chapter_count:          chapters.length,
          is_active:              true,
          enable_voice_recording: enableVoiceRecording,
        })
        .eq('id', studyId)
      if (sErr) throw sErr

      await insertChaptersAndQuestions(studyId, chapters)
      await insertScreenerQuestions(studyId)

      navigate(`/admin/studies/${studyId}`)
    } catch (e) {
      setError(e.message)
      setSaving(false)
      setShowModal(false)
    }
  }

  // ── Shared insert helpers ──────────────────────────────────────
  async function insertChaptersAndQuestions(sid, chaps) {
    for (const ch of chaps) {
      const { data: chapter, error: cErr } = await supabase
        .from('chapters')
        .insert({
          study_id:        sid,
          position:        ch.position,
          title:           ch.title.trim(),
          task_text:       ch.task_text.trim(),
          figma_url:       ch.figma_url.trim() || defaultFigma.trim() || null,
          is_figma_make:   ch.is_figma_make ?? false,
          transition_desc: ch.transition_desc.trim() || null,
        })
        .select().single()
      if (cErr) throw cErr

      const questions = ch.survey_questions
        .filter(q => q.prompt?.trim())
        .map(q => ({
          chapter_id:   chapter.id,
          position:     q.position,
          kind:         q.kind,
          prompt:       q.prompt.trim(),
          options:      q.kind === 'multiple_choice' ? parseOptions(q.options) : null,
          scale_labels: q.kind === 'opinion_scale'   ? (q.scale_labels || null) : null,
        }))
      if (questions.length) {
        const { error: qErr } = await supabase.from('survey_questions').insert(questions)
        if (qErr) throw qErr
      }

      const validTriggers = (ch.triggers || []).filter(t => t.name?.trim() && t.frame_name?.trim())
      await saveTriggerDefinitions(chapter.id, validTriggers)
    }
  }

  async function insertScreenerQuestions(sid) {
    if (!useScreener || !screenerQuestions.length) return
    const rows = screenerQuestions
      .filter(q => q.prompt.trim())
      .map((q, i) => ({
        study_id: sid,
        position: i + 1,
        prompt:   q.prompt.trim(),
        kind:     q.kind,
        options:  q.kind === 'multiple_choice' ? parseOptions(q.options) : null,
      }))
    if (rows.length) {
      const { error } = await supabase.from('screener_questions').insert(rows)
      if (error) throw error
    }
  }

  // ── Render helpers ─────────────────────────────────────────────
  const inputClass = `
    w-full bg-bg border border-border rounded-md px-3 py-2
    text-sm text-text placeholder-muted focus:outline-none
    focus:border-accent/50 transition-colors
  `

  if (loadingEdit) return <Loading text="Loading study…" />

  // ── Step 0: Template picker (new study only) ───────────────────
  if (step === 0) {
    return (
      <div className="min-h-screen bg-bg p-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="text-muted hover:text-text text-sm transition-colors"
            >
              ← Back
            </button>
            <div>
              <div className="font-mono text-[10px] tracking-widest uppercase text-accent mb-0.5">
                New Study
              </div>
              <h1 className="text-xl font-semibold tracking-tight">Choose a Template</h1>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {TEMPLATES.map(tpl => (
              <button
                key={tpl.id}
                onClick={() => applyTemplate(tpl)}
                className="text-left bg-surface border border-border rounded-xl p-5
                  hover:border-accent/40 transition-all group"
              >
                <div className="text-sm font-semibold text-text mb-1 group-hover:text-accent transition-colors">
                  {tpl.name}
                </div>
                <div className="text-xs text-muted">{tpl.description}</div>
                {tpl.id !== 'blank' && (
                  <div className="mt-3 font-mono text-[10px] text-accent/60">
                    {tpl.chapters.length} task{tpl.chapters.length !== 1 ? 's' : ''}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Step 1: Study form ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg p-8">
      <div className="max-w-2xl mx-auto">

        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => isEdit ? navigate(`/admin/studies/${studyId}`) : setStep(0)}
            className="text-muted hover:text-text text-sm transition-colors"
          >
            {isEdit ? '← Results' : '← Templates'}
          </button>
          <div>
            <div className="font-mono text-[10px] tracking-widest uppercase text-accent mb-0.5">
              {isEdit ? 'Edit Study' : 'New Study'}
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Study Builder</h1>
          </div>
        </div>

        <div className="flex flex-col gap-6">

          {/* Study details */}
          <Card>
            <h2 className="text-sm font-semibold mb-4">Study Details</h2>
            <div className="flex flex-col gap-4">
              <div>
                <Label className="mb-1.5 block">Title *</Label>
                <input className={inputClass} placeholder="e.g. Supplier Portal Onboarding" value={title} onChange={e => setTitle(e.target.value)} />
              </div>
              <div>
                <Label className="mb-1.5 block">Description (shown on welcome screen)</Label>
                <textarea className={inputClass} rows={2} placeholder="Brief context for reviewers…" value={description} onChange={e => setDesc(e.target.value)} />
              </div>
              <div>
                <Label className="mb-1.5 block">Default Figma URL (used if task has none)</Label>
                <input className={inputClass} placeholder="https://www.figma.com/proto/…" value={defaultFigma} onChange={e => setDefaultFigma(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5 block">Thank-you message</Label>
                  <input className={inputClass} value={thankYou} onChange={e => setThankYou(e.target.value)} />
                </div>
                <div>
                  <Label className="mb-1.5 block">Redirect URL (optional)</Label>
                  <input className={inputClass} placeholder="https://…" value={redirect} onChange={e => setRedirect(e.target.value)} />
                </div>
              </div>

              {/* Screener toggle */}
              <div className="border-t border-border pt-4">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={useScreener}
                    onChange={e => setUseScreener(e.target.checked)}
                    className="w-4 h-4 rounded accent-accent"
                  />
                  <span className="text-sm text-text group-hover:text-accent transition-colors">
                    Add screener questions
                  </span>
                </label>

                {useScreener && (
                  <div className="mt-4 flex flex-col gap-3">
                    {screenerQuestions.map((q, idx) => (
                      <div key={idx} className="bg-bg border border-border rounded-lg p-3 flex flex-col gap-2">
                        <div className="flex items-start gap-2">
                          <select
                            className="bg-surface border border-border rounded px-2 py-1 text-xs text-text font-mono flex-shrink-0 focus:outline-none"
                            value={q.kind}
                            onChange={e => updateScreenerQuestion(idx, 'kind', e.target.value)}
                          >
                            <option value="text">Text</option>
                            <option value="yes_no">Yes / No</option>
                            <option value="multiple_choice">Multiple Choice</option>
                          </select>
                          <input
                            className="flex-1 bg-transparent border-none text-sm text-text placeholder-muted focus:outline-none"
                            placeholder="Question prompt…"
                            value={q.prompt}
                            onChange={e => updateScreenerQuestion(idx, 'prompt', e.target.value)}
                          />
                          <button
                            onClick={() => removeScreenerQuestion(idx)}
                            className="text-muted hover:text-warn text-xs flex-shrink-0 transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                        {q.kind === 'multiple_choice' && (
                          <div>
                            <Label className="mb-1 block">Options (comma-separated)</Label>
                            <input
                              className={inputClass + ' text-xs'}
                              placeholder="Option A, Option B, Option C"
                              value={q.options}
                              onChange={e => updateScreenerQuestion(idx, 'options', e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={addScreenerQuestion}
                      className="text-xs text-muted hover:text-text transition-colors font-mono text-left"
                    >
                      + Add screener question
                    </button>
                  </div>
                )}
              </div>

              {/* Voice Recording toggle */}
              <div className="border-t border-border pt-4">
                <label className="flex items-start gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={enableVoiceRecording}
                    onChange={e => setEnableVoiceRecording(e.target.checked)}
                    className="w-4 h-4 rounded accent-accent mt-0.5 flex-shrink-0"
                  />
                  <div>
                    <span className="text-sm text-text group-hover:text-accent transition-colors block">
                      Record participant audio
                    </span>
                    <span className="text-xs text-muted leading-relaxed block mt-0.5">
                      Participants will be prompted for microphone permission. Each task session is recorded separately.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </Card>

          {/* Tasks */}
          {chapters.map((ch, idx) => (
            <Card key={ch.id ?? ch.position}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold">Task {ch.position}</h2>
                {chapters.length > 1 && (
                  <button
                    onClick={() => removeChapter(ch.position)}
                    className="text-muted hover:text-warn text-xs transition-colors font-mono"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-1.5 block">Task title</Label>
                    <input className={inputClass} placeholder="e.g. Find a product" value={ch.title} onChange={e => updateChapter(ch.position, 'title', e.target.value)} />
                  </div>
                  <div>
                    <Label className="mb-1.5 block">Figma URL (override)</Label>
                    <input className={inputClass} placeholder="Leave blank to use default" value={ch.figma_url} onChange={e => updateChapter(ch.position, 'figma_url', e.target.value)} />
                    <label className="flex items-center gap-2 mt-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={ch.is_figma_make}
                        onChange={e => updateChapter(ch.position, 'is_figma_make', e.target.checked)}
                        className="w-3.5 h-3.5 rounded accent-accent"
                      />
                      <span className="text-xs text-muted group-hover:text-text transition-colors">
                        This is a Figma Make prototype
                      </span>
                    </label>
                  </div>
                </div>
                <div>
                  <Label className="mb-1.5 block">Task text (shown to reviewer)</Label>
                  <textarea className={inputClass} rows={2} placeholder="Describe the task clearly and concisely…" value={ch.task_text} onChange={e => updateChapter(ch.position, 'task_text', e.target.value)} />
                </div>
                {idx < chapters.length - 1 && (
                  <div>
                    <Label className="mb-1.5 block">Transition description (shown before task {ch.position + 1})</Label>
                    <input className={inputClass} placeholder="Brief description of the next task…" value={ch.transition_desc} onChange={e => updateChapter(ch.position, 'transition_desc', e.target.value)} />
                  </div>
                )}

                {/* Survey questions */}
                <div>
                  <Label className="mb-2 block">Survey questions</Label>
                  <div className="flex flex-col gap-2">
                    {ch.survey_questions.map((q, qIdx) => (
                      <div key={q.id ?? qIdx} className="bg-bg border border-border rounded-lg p-3 flex flex-col gap-2">
                        <div className="flex items-start gap-2">
                          <select
                            className="bg-surface border border-border rounded px-2 py-1 text-xs text-text font-mono flex-shrink-0 focus:outline-none"
                            value={q.kind}
                            onChange={e => updateQuestion(ch.position, qIdx, 'kind', e.target.value)}
                          >
                            <option value="rating">Rating (stars)</option>
                            <option value="text">Text</option>
                            <option value="opinion_scale">Opinion Scale</option>
                            <option value="multiple_choice">Multiple Choice</option>
                            <option value="yes_no">Yes / No</option>
                            <option value="nps">NPS</option>
                          </select>
                          <input
                            className="flex-1 bg-transparent border-none text-sm text-text placeholder-muted focus:outline-none"
                            placeholder="Question prompt…"
                            value={q.prompt}
                            onChange={e => updateQuestion(ch.position, qIdx, 'prompt', e.target.value)}
                          />
                          <button
                            onClick={() => removeQuestion(ch.position, qIdx)}
                            className="text-muted hover:text-warn text-xs flex-shrink-0 transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                        {q.kind === 'multiple_choice' && (
                          <div>
                            <Label className="mb-1 block">Options (comma-separated)</Label>
                            <input
                              className={inputClass + ' text-xs'}
                              placeholder="Option A, Option B, Option C"
                              value={Array.isArray(q.options) ? q.options.join(', ') : (q.options || '')}
                              onChange={e => updateQuestion(ch.position, qIdx, 'options', e.target.value)}
                            />
                          </div>
                        )}
                        {q.kind === 'opinion_scale' && (
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <Label className="mb-1 block">Low label</Label>
                              <input
                                className={inputClass + ' text-xs'}
                                placeholder="e.g. Very difficult"
                                value={q.scale_labels?.low || ''}
                                onChange={e => updateQuestion(ch.position, qIdx, 'scale_labels', { ...(q.scale_labels || {}), low: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label className="mb-1 block">High label</Label>
                              <input
                                className={inputClass + ' text-xs'}
                                placeholder="e.g. Very easy"
                                value={q.scale_labels?.high || ''}
                                onChange={e => updateQuestion(ch.position, qIdx, 'scale_labels', { ...(q.scale_labels || {}), high: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label className="mb-1 block">Max (default 7)</Label>
                              <input
                                type="number"
                                min={2}
                                max={10}
                                className={inputClass + ' text-xs'}
                                placeholder="7"
                                value={q.scale_labels?.max || ''}
                                onChange={e => updateQuestion(ch.position, qIdx, 'scale_labels', { ...(q.scale_labels || {}), max: parseInt(e.target.value) || 7 })}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => addQuestion(ch.position)}
                      className="text-xs text-muted hover:text-text transition-colors font-mono text-left"
                    >
                      + Add question
                    </button>
                  </div>
                </div>

                {/* Triggers (not available for Figma Make) */}
                {!ch.is_figma_make && (
                  <div className="border-t border-border pt-4">
                    <Label className="mb-2 block">Triggers</Label>
                    <p className="text-xs text-muted mb-3 leading-relaxed">
                      Fire a named event when the participant navigates to a specific Figma frame.
                    </p>
                    <div className="flex flex-col gap-2">
                      {(ch.triggers || []).map((t, tIdx) => (
                        <div key={tIdx} className="bg-bg border border-border rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <input
                              className="flex-1 bg-transparent border-none text-sm text-text placeholder-muted focus:outline-none"
                              placeholder="Trigger name (e.g. Clicked Submit)"
                              value={t.name}
                              onChange={e => updateTrigger(ch.position, tIdx, 'name', e.target.value)}
                            />
                            <span className="text-muted text-xs">→</span>
                            <input
                              className="flex-1 bg-transparent border-none text-sm text-text placeholder-muted focus:outline-none font-mono text-xs"
                              placeholder="Exact Figma frame name"
                              value={t.frame_name}
                              onChange={e => updateTrigger(ch.position, tIdx, 'frame_name', e.target.value)}
                            />
                            <button
                              onClick={() => removeTrigger(ch.position, tIdx)}
                              className="text-muted hover:text-warn text-xs flex-shrink-0 transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                      {(ch.triggers || []).length < 8 && (
                        <button
                          onClick={() => addTrigger(ch.position)}
                          className="text-xs text-muted hover:text-text transition-colors font-mono text-left"
                        >
                          + Add trigger
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}

          {/* Add task */}
          {chapters.length < 5 && (
            <button
              onClick={addChapter}
              className="w-full border border-dashed border-border rounded-xl py-4
                text-sm text-muted hover:border-accent/40 hover:text-text transition-colors"
            >
              + Add Task {chapters.length + 1}
            </button>
          )}

          {error && <p className="text-warn text-sm font-mono">{error}</p>}

          <div className="flex justify-end gap-3 pb-8">
            <Btn variant="secondary" onClick={() => navigate(isEdit ? `/admin/studies/${studyId}` : '/admin/dashboard')}>
              Cancel
            </Btn>
            <Btn onClick={openSaveModal} disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes →' : 'Create Study →'}
            </Btn>
          </div>

        </div>
      </div>

      {/* Save modal */}
      {showModal && (
        <SaveModal
          sessionCount={sessionCount}
          canKeepData={canKeepData}
          keepDataBlockReason={keepDataBlockReason}
          saving={saving}
          onKeep={handleKeepData}
          onDiscard={handleDiscardData}
          onCancel={() => setShowModal(false)}
        />
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getStudyWithChapters, saveSurveyAnswers, completeSession } from '../../lib/db'
import { Card, ProgressBar, Label, Btn, StarRating, Loading, ErrorState } from '../../components/UI'

export default function Survey() {
  const { studyId, chapterPos } = useParams()
  const pos = parseInt(chapterPos, 10)
  const navigate = useNavigate()

  const [study, setStudy]     = useState(null)
  const [chapter, setChapter] = useState(null)
  const [answers, setAnswers] = useState({})
  const [error, setError]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    getStudyWithChapters(studyId)
      .then(s => {
        setStudy(s)
        const ch = s.chapters.find(c => c.position === pos)
        if (!ch) throw new Error('Task not found')
        setChapter(ch)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [studyId, pos])

  function setAnswer(questionId, field, value) {
    setAnswers(prev => ({ ...prev, [questionId]: { ...(prev[questionId] || {}), [field]: value } }))
  }

  async function handleSubmit() {
    setSaving(true)
    try {
      const crId = sessionStorage.getItem(`cr_${pos}`)
      const answerRows = chapter.survey_questions.map(q => {
        const ans = answers[q.id] || {}
        return {
          question_id:   q.id,
          rating_value:  q.kind === 'rating'         ? (ans.rating_value  ?? null) : null,
          text_value:    q.kind === 'text'            ? (ans.text_value    ?? null) : null,
          opinion_value: q.kind === 'opinion_scale'   ? (ans.opinion_value ?? null) : null,
          nps_value:     q.kind === 'nps'             ? (ans.nps_value     ?? null) : null,
          choice_value:  q.kind === 'multiple_choice' ? (ans.choice_value  ?? null) : null,
          bool_value:    q.kind === 'yes_no'          ? (ans.bool_value    ?? null) : null,
        }
      })

      await saveSurveyAnswers(crId, answerRows)

      const isLastChapter = pos === study.chapter_count
      if (isLastChapter) {
        const sessionId = sessionStorage.getItem('session_id')
        await completeSession(sessionId)
        navigate(`/s/${studyId}/done`)
      } else {
        navigate(`/s/${studyId}/ch/${pos + 1}`)
      }
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  if (loading) return <Loading />
  if (error)   return <ErrorState message={error} />

  const isLastChapter = pos === study.chapter_count
  const progressPct = Math.round(((pos - 0.3) / study.chapter_count) * 95)

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md flex flex-col gap-6">

        <div className="flex items-center gap-3">
          <ProgressBar value={progressPct} />
          <span className="font-mono text-[10px] text-accent whitespace-nowrap">
            Task {pos}/{study.chapter_count}
          </span>
        </div>

        <Card>
          <div className="flex flex-col gap-5">

            <div>
              <Label className="mb-1 block">Quick reaction</Label>
              <p className="text-xs text-muted">
                {isLastChapter ? 'Last set of questions — almost done.' : 'Then on to the next task.'}
              </p>
            </div>

            {chapter.survey_questions.length === 0 && (
              <p className="text-xs text-muted italic">No questions configured for this task.</p>
            )}

            {chapter.survey_questions.map(q => (
              <div key={q.id} className="bg-bg border border-border rounded-lg p-4 flex flex-col gap-3">
                <Label className="mb-0.5 block">{q.prompt}</Label>

                {/* Rating (1–5 stars) */}
                {q.kind === 'rating' && (
                  <StarRating
                    value={answers[q.id]?.rating_value ?? 0}
                    onChange={v => setAnswer(q.id, 'rating_value', v)}
                  />
                )}

                {/* Text */}
                {q.kind === 'text' && (
                  <textarea
                    className="w-full bg-surface border border-border rounded-md p-3
                      text-sm text-text placeholder-muted resize-none focus:outline-none
                      focus:border-accent/50 transition-colors"
                    rows={3}
                    placeholder="Type your thoughts…"
                    value={answers[q.id]?.text_value ?? ''}
                    onChange={e => setAnswer(q.id, 'text_value', e.target.value)}
                  />
                )}

                {/* Opinion scale */}
                {q.kind === 'opinion_scale' && (
                  <OpinionScale
                    q={q}
                    value={answers[q.id]?.opinion_value ?? null}
                    onChange={v => setAnswer(q.id, 'opinion_value', v)}
                  />
                )}

                {/* Multiple choice */}
                {q.kind === 'multiple_choice' && (
                  <MultipleChoice
                    q={q}
                    value={answers[q.id]?.choice_value ?? null}
                    onChange={v => setAnswer(q.id, 'choice_value', v)}
                  />
                )}

                {/* Yes / No */}
                {q.kind === 'yes_no' && (
                  <YesNo
                    value={answers[q.id]?.bool_value ?? null}
                    onChange={v => setAnswer(q.id, 'bool_value', v)}
                  />
                )}

                {/* NPS */}
                {q.kind === 'nps' && (
                  <NpsScale
                    value={answers[q.id]?.nps_value ?? null}
                    onChange={v => setAnswer(q.id, 'nps_value', v)}
                  />
                )}
              </div>
            ))}

            <Btn onClick={handleSubmit} disabled={saving} variant="success" className="w-full">
              {saving
                ? 'Saving…'
                : isLastChapter
                ? 'Finish Session →'
                : 'Next Task →'
              }
            </Btn>

          </div>
        </Card>

      </div>
    </div>
  )
}

// ── Question type sub-components ──────────────────────────────

function OpinionScale({ q, value, onChange }) {
  const max = q.scale_labels?.max ?? 7
  const low = q.scale_labels?.low ?? ''
  const high = q.scale_labels?.high ?? ''
  const nums = Array.from({ length: max }, (_, i) => i + 1)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1.5 flex-wrap">
        {nums.map(n => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`w-9 h-9 rounded-md text-sm font-semibold transition-all
              ${value === n
                ? 'bg-accent text-bg'
                : 'bg-bg border border-border text-muted hover:border-accent/50 hover:text-text'
              }`}
          >
            {n}
          </button>
        ))}
      </div>
      {(low || high) && (
        <div className="flex justify-between">
          <span className="text-[10px] text-muted">{low}</span>
          <span className="text-[10px] text-muted">{high}</span>
        </div>
      )}
    </div>
  )
}

function MultipleChoice({ q, value, onChange }) {
  const options = Array.isArray(q.options) ? q.options : []
  return (
    <div className="flex flex-col gap-2">
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-all
            ${value === opt
              ? 'bg-accent/10 border border-accent text-text'
              : 'bg-bg border border-border text-muted hover:border-accent/40 hover:text-text'
            }`}
        >
          <span className={`w-3.5 h-3.5 rounded-full border inline-flex items-center justify-center mr-2 flex-shrink-0
            ${value === opt ? 'border-accent' : 'border-muted'}`}>
            {value === opt && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
          </span>
          {opt}
        </button>
      ))}
    </div>
  )
}

function YesNo({ value, onChange }) {
  return (
    <div className="flex gap-2">
      <button
        onClick={() => onChange(true)}
        className={`flex-1 py-2.5 rounded-md text-sm font-semibold transition-all
          ${value === true
            ? 'bg-success text-bg'
            : 'bg-bg border border-border text-muted hover:border-success/50 hover:text-text'
          }`}
      >
        ✓ Yes
      </button>
      <button
        onClick={() => onChange(false)}
        className={`flex-1 py-2.5 rounded-md text-sm font-semibold transition-all
          ${value === false
            ? 'bg-warn text-white'
            : 'bg-bg border border-border text-muted hover:border-warn/50 hover:text-text'
          }`}
      >
        ✗ No
      </button>
    </div>
  )
}

function NpsScale({ value, onChange }) {
  const nums = Array.from({ length: 11 }, (_, i) => i)
  function colorFor(n) {
    if (n <= 6) return value === n ? 'bg-warn text-white' : 'bg-bg border border-border text-warn/70 hover:bg-warn/10'
    if (n <= 8) return value === n ? 'bg-muted text-bg' : 'bg-bg border border-border text-muted hover:bg-muted/10'
    return value === n ? 'bg-success text-bg' : 'bg-bg border border-border text-success/70 hover:bg-success/10'
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1 flex-wrap">
        {nums.map(n => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`w-8 h-8 rounded-md text-xs font-semibold transition-all ${colorFor(n)}`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between">
        <span className="text-[10px] text-muted">Not likely</span>
        <span className="text-[10px] text-muted">Very likely</span>
      </div>
    </div>
  )
}

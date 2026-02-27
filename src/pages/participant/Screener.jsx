import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getStudyWithChapters, saveScreenerAnswers } from '../../lib/db'
import { Card, ProgressBar, Label, Btn, Loading, ErrorState, BrandBar } from '../../components/UI'

export default function Screener() {
  const { studyId } = useParams()
  const navigate = useNavigate()

  const [study, setStudy]       = useState(null)
  const [answers, setAnswers]   = useState({})
  const [error, setError]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    getStudyWithChapters(studyId)
      .then(setStudy)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [studyId])

  function setAnswer(questionId, value) {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  async function handleSubmit() {
    setSaving(true)
    try {
      const sessionId = sessionStorage.getItem('session_id')
      await saveScreenerAnswers(sessionId, answers)
      navigate(`/s/${studyId}/ch/1/task`)
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  if (loading) return <Loading />
  if (error)   return <ErrorState message={error} />

  const questions = study.screener_questions || []

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md flex flex-col gap-6">

        <ProgressBar value={5} />

        <Card>
          <div className="flex flex-col gap-5">

            <BrandBar />

            <div>
              <Label className="mb-1 block">Before we begin</Label>
              <p className="text-xs text-muted leading-relaxed">
                A few quick questions to help us understand your background.
              </p>
            </div>

            {questions.map(q => (
              <div key={q.id} className="bg-bg border border-border rounded-lg p-4 flex flex-col gap-3">
                <Label className="block">{q.prompt}</Label>

                {/* Text */}
                {q.kind === 'text' && (
                  <textarea
                    className="w-full bg-surface border border-border rounded-md p-3
                      text-sm text-text placeholder-muted resize-none focus:outline-none
                      focus:border-accent/50 transition-colors"
                    rows={3}
                    placeholder="Type your answer…"
                    value={answers[q.id] ?? ''}
                    onChange={e => setAnswer(q.id, e.target.value)}
                  />
                )}

                {/* Yes / No */}
                {q.kind === 'yes_no' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAnswer(q.id, 'yes')}
                      className={`flex-1 py-2.5 rounded-md text-sm font-semibold transition-all
                        ${answers[q.id] === 'yes'
                          ? 'bg-accent text-bg'
                          : 'bg-bg border border-border text-muted hover:border-accent/50 hover:text-text'
                        }`}
                    >
                      ✓ Yes
                    </button>
                    <button
                      onClick={() => setAnswer(q.id, 'no')}
                      className={`flex-1 py-2.5 rounded-md text-sm font-semibold transition-all
                        ${answers[q.id] === 'no'
                          ? 'bg-warn text-white'
                          : 'bg-bg border border-border text-muted hover:border-warn/50 hover:text-text'
                        }`}
                    >
                      ✗ No
                    </button>
                  </div>
                )}

                {/* Multiple choice */}
                {q.kind === 'multiple_choice' && (
                  <div className="flex flex-col gap-2">
                    {(Array.isArray(q.options) ? q.options : []).map(opt => (
                      <button
                        key={opt}
                        onClick={() => setAnswer(q.id, opt)}
                        className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-all
                          ${answers[q.id] === opt
                            ? 'bg-accent/10 border border-accent text-text'
                            : 'bg-bg border border-border text-muted hover:border-accent/40 hover:text-text'
                          }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full border inline-flex items-center justify-center mr-2 flex-shrink-0
                          ${answers[q.id] === opt ? 'border-accent' : 'border-muted'}`}>
                          {answers[q.id] === opt && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
                        </span>
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <Btn onClick={handleSubmit} disabled={saving} className="w-full">
              {saving ? 'Saving…' : 'Continue →'}
            </Btn>

          </div>
        </Card>

      </div>
    </div>
  )
}

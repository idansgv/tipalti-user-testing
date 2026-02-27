import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getStudyWithChapters, createSession, getSessionCount } from '../../lib/db'
import { Card, ProgressBar, ChapterDots, Label, Btn, Loading, ErrorState, BrandBar, SessionClosed } from '../../components/UI'

export default function Welcome() {
  const { studyId } = useParams()
  const navigate = useNavigate()
  const [study, setStudy] = useState(null)
  const [gate, setGate] = useState(null)   // null | { message }
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const s = await getStudyWithChapters(studyId)

        // Gate 1: expired
        if (s.invite_expires_at && new Date(s.invite_expires_at) < new Date()) {
          setGate({ message: 'This research session is no longer active.' })
          return
        }

        // Gate 2: full
        if (s.max_responses) {
          const count = await getSessionCount(s.id)
          if (count >= s.max_responses) {
            setGate({ message: 'This research session has reached its maximum number of responses.' })
            return
          }
        }

        setStudy(s)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [studyId])

  async function handleBegin() {
    setStarting(true)
    try {
      const session = await createSession(studyId)
      sessionStorage.setItem('session_id', session.id)
      sessionStorage.setItem('study_id', studyId)
      if (study.screener_questions && study.screener_questions.length > 0) {
        navigate(`/s/${studyId}/screener`)
      } else {
        navigate(`/s/${studyId}/ch/1/task`)
      }
    } catch (e) {
      setError(e.message)
      setStarting(false)
    }
  }

  if (loading) return <Loading />
  if (gate)    return <SessionClosed message={gate.message} />
  if (error)   return <ErrorState message={error} />

  const estMins = study.chapter_count * 3

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md flex flex-col gap-6">

        <ProgressBar value={0} />

        <Card>
          <div className="flex flex-col gap-5">

            <BrandBar />

            <div>
              <Label className="mb-2 block">Research Session</Label>
              <h1 className="text-xl font-semibold tracking-tight leading-snug">
                {study.title}
              </h1>
              {study.description && (
                <p className="text-muted text-sm mt-2 leading-relaxed">
                  {study.description}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <div className="bg-bg border border-border rounded-lg p-4 flex flex-col gap-2">
                <Label>Tasks in this session</Label>
                <ChapterDots total={study.chapter_count} current={-1} />
              </div>

              <div className="bg-bg border border-border rounded-lg p-4">
                <Label>Estimated time</Label>
                <p className="text-sm text-text mt-1">~{estMins} minutes</p>
              </div>

              <div className="bg-bg border border-border rounded-lg p-4">
                <Label>Note</Label>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  Your responses are anonymous and used only to improve our product.
                  You can stop at any time.
                </p>
              </div>
            </div>

            <Btn onClick={handleBegin} disabled={starting} className="w-full">
              {starting ? 'Starting…' : 'Begin Session →'}
            </Btn>

          </div>
        </Card>

      </div>
    </div>
  )
}

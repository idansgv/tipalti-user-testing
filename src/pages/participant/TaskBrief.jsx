import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getStudyWithChapters, startChapterResponse } from '../../lib/db'
import { Card, ProgressBar, Label, Btn, Loading, ErrorState, BrandBar } from '../../components/UI'

export default function TaskBrief() {
  const { studyId, chapterPos } = useParams()
  const pos = parseInt(chapterPos, 10)
  const navigate = useNavigate()

  const [study, setStudy]     = useState(null)
  const [chapter, setChapter] = useState(null)
  const [error, setError]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)

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

  async function handleStart() {
    setStarting(true)
    try {
      const sessionId = sessionStorage.getItem('session_id')
      const cr = await startChapterResponse(sessionId, chapter.id)
      sessionStorage.setItem(`cr_${pos}`, cr.id)
      navigate(`/s/${studyId}/ch/${pos}/prototype`)
    } catch (e) {
      setError(e.message)
      setStarting(false)
    }
  }

  if (loading) return <Loading />
  if (error)   return <ErrorState message={error} />

  const totalChapters = study.chapter_count
  const progressPct = Math.round(((pos - 1) / totalChapters) * 80)

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md flex flex-col gap-6">

        <div className="flex items-center gap-3">
          <ProgressBar value={progressPct} />
          <span className="font-mono text-[10px] text-accent whitespace-nowrap">
            Task {pos}/{totalChapters}
          </span>
        </div>

        <Card>
          <div className="flex flex-col gap-5">

            <BrandBar />

            <div>
              <Label className="mb-1 block">Task {pos}</Label>
              <h2 className="text-lg font-semibold tracking-tight">
                {chapter.title}
              </h2>
            </div>

            <div className="bg-bg border border-border rounded-lg p-4">
              <Label className="mb-2 block">Your task</Label>
              <p className="text-sm leading-relaxed text-text">
                {chapter.task_text}
              </p>
            </div>

            <div className="bg-bg border border-border rounded-lg p-4 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-accent opacity-60" />
              <p className="text-xs text-muted">
                A timer will start when you click <strong className="text-text">Start Task</strong>.
                Take your time — there's no penalty for going slow.
              </p>
            </div>

            <Btn onClick={handleStart} disabled={starting} className="w-full">
              {starting ? 'Loading…' : 'Start Task →'}
            </Btn>

          </div>
        </Card>

      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getStudyWithChapters } from '../../lib/db'
import { Card, ProgressBar, ChapterDots, Label, Btn, Loading, ErrorState } from '../../components/UI'

export default function ChapterTransition() {
  const { studyId, chapterPos } = useParams()
  const pos = parseInt(chapterPos, 10) // this is the NEXT chapter number
  const navigate = useNavigate()

  const [study, setStudy]     = useState(null)
  const [chapter, setChapter] = useState(null)
  const [error, setError]     = useState(null)
  const [loading, setLoading] = useState(true)

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

  if (loading) return <Loading />
  if (error)   return <ErrorState message={error} />

  const progressPct = Math.round(((pos - 1) / study.chapter_count) * 85)

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md flex flex-col gap-6">

        <ProgressBar value={progressPct} color="bg-success" />

        <Card className="text-center">
          <div className="flex flex-col items-center gap-5">

            {/* Big task number */}
            <div>
              <div className="font-mono text-6xl text-success leading-none">{pos}</div>
              <div className="font-mono text-[9px] text-muted tracking-[0.15em] uppercase mt-1">
                of {study.chapter_count} tasks
              </div>
            </div>

            {/* Chapter dots */}
            <div className="flex justify-center">
              <ChapterDots total={study.chapter_count} current={pos - 1} />
            </div>

            {/* Next task info */}
            <div className="bg-bg border border-border rounded-lg p-4 w-full text-left">
              <Label className="mb-1 block">Up next</Label>
              <p className="text-sm font-semibold text-text">{chapter.title}</p>
              {chapter.transition_desc && (
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  {chapter.transition_desc}
                </p>
              )}
            </div>

            <p className="text-xs text-muted">Take a breath — continue when you're ready.</p>

            <Btn
              variant="success"
              onClick={() => navigate(`/s/${studyId}/ch/${pos}/task`)}
              className="w-full"
            >
              Continue →
            </Btn>

          </div>
        </Card>

      </div>
    </div>
  )
}

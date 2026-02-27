import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getStudyWithChapters } from '../../lib/db'
import { Card, ProgressBar, ChapterDots, Loading, BrandBar } from '../../components/UI'

export default function ThankYou() {
  const { studyId } = useParams()
  const [study, setStudy] = useState(null)

  useEffect(() => {
    getStudyWithChapters(studyId)
      .then(setStudy)
      .catch(() => {}) // best-effort

    // Clear session data from sessionStorage
    const keys = Object.keys(sessionStorage).filter(k =>
      k === 'session_id' || k === 'study_id' || k.startsWith('cr_')
    )
    keys.forEach(k => sessionStorage.removeItem(k))
  }, [studyId])

  // Optional: redirect after delay if study has redirect_url
  useEffect(() => {
    if (study?.redirect_url) {
      const t = setTimeout(() => {
        window.location.href = study.redirect_url
      }, 4000)
      return () => clearTimeout(t)
    }
  }, [study])

  if (!study) return <Loading />

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md flex flex-col gap-6">

        <ProgressBar value={100} />

        <Card className="text-center">
          <div className="flex flex-col items-center gap-5 py-4">

            <BrandBar />

            {/* Checkmark */}
            <div className="w-14 h-14 rounded-full bg-accent/10 border border-accent/25
              flex items-center justify-center text-2xl text-accent">
              ✓
            </div>

            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                {study.thank_you_msg || 'All done!'}
              </h1>
              <p className="text-sm text-muted mt-2">
                Your responses have been saved. Thank you for your time.
              </p>
            </div>

            {/* All dots filled */}
            <div className="flex justify-center">
              <ChapterDots total={study.chapter_count} current={study.chapter_count} />
            </div>

            {study.redirect_url && (
              <p className="text-xs text-muted font-mono">
                Redirecting in a moment…
              </p>
            )}

          </div>
        </Card>

      </div>
    </div>
  )
}

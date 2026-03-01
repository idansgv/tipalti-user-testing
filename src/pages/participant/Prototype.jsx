import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getStudyWithChapters, finishChapterResponse, getTriggerDefinitions, saveTriggerEvent, saveVoiceRecording } from '../../lib/db'
import { supabase } from '../../lib/supabase'
import { Loading, ErrorState } from '../../components/UI'

const MC_AUTO_HIDE_MS = 3000

export default function Prototype() {
  const { studyId, chapterPos } = useParams()
  const pos = parseInt(chapterPos, 10)
  const navigate = useNavigate()

  const [chapter, setChapter]     = useState(null)
  const [study, setStudy]         = useState(null)
  const [error, setError]         = useState(null)
  const [loading, setLoading]     = useState(true)
  const [mcVisible, setMcVisible] = useState(true)
  const [elapsed, setElapsed]     = useState(0)
  const [finishing, setFinishing] = useState(false)
  const [micToast, setMicToast]   = useState(null)  // null | 'requesting' | 'denied'

  const startTimeRef      = useRef(Date.now())
  const iframeRef         = useRef(null)
  const hideTimerRef      = useRef(null)
  const tickRef           = useRef(null)
  const triggerDefsRef    = useRef([])
  const firedTriggerIds   = useRef(new Set())
  const mediaRecorderRef  = useRef(null)
  const audioChunksRef    = useRef([])
  const micStreamRef      = useRef(null)

  // ── Load study data ──────────────────────────────────────────
  useEffect(() => {
    getStudyWithChapters(studyId)
      .then(s => {
        const ch = s.chapters.find(c => c.position === pos)
        if (!ch) throw new Error('Task not found')
        setChapter(ch)
        setStudy(s)
        // Trigger defs are already loaded via getStudyWithChapters
        triggerDefsRef.current = ch.trigger_definitions || []
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [studyId, pos])

  // ── Voice recording setup ─────────────────────────────────────
  useEffect(() => {
    if (loading || error || !study?.enable_voice_recording) return

    async function startRecording() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        micStreamRef.current = stream
        audioChunksRef.current = []

        const recorder = new MediaRecorder(stream)
        recorder.ondataavailable = e => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data)
        }
        recorder.start()
        mediaRecorderRef.current = recorder
      } catch {
        setMicToast('denied')
        setTimeout(() => setMicToast(null), 4000)
      }
    }

    startRecording()

    return () => {
      // Cleanup on unmount without finish (e.g. navigate away)
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => t.stop())
      }
    }
  }, [loading, error, study])

  // ── Figma postMessage trigger listener ───────────────────────
  useEffect(() => {
    if (loading || error) return

    function handleMessage(event) {
      let frameName = null

      // Regular Figma: filter by origin
      if (event.origin.includes('figma.com')) {
        try {
          const msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data

          if (msg?.type === 'PRESENTED_DESIGN_NAVIGATION') {
            frameName = msg?.data?.destination?.name
              || msg?.data?.destinationId
              || null
          }

          if (import.meta.env.DEV && msg?.type && msg.type !== 'PRESENTED_DESIGN_NAVIGATION') {
            console.debug('[Prototype] Figma postMessage:', msg.type, msg)
          }
        } catch {
          // Non-JSON messages from Figma — ignore
        }
      }

      // Figma Make: custom UT_TRIGGER protocol (any origin)
      if (!frameName && chapter?.is_figma_make) {
        try {
          const msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
          if (msg?.type === 'UT_TRIGGER' && msg?.name) {
            frameName = msg.name
            if (import.meta.env.DEV) console.debug('[Prototype] UT_TRIGGER received:', msg.name)
          }
        } catch {}
      }

      if (!frameName) return

      const crId = sessionStorage.getItem(`cr_${pos}`)
      if (!crId) return

      // Match against trigger definitions
      const defs = triggerDefsRef.current
      defs.forEach(def => {
        if (def.frame_name === frameName && !firedTriggerIds.current.has(def.id)) {
          firedTriggerIds.current.add(def.id)
          // Fire and forget — don't block UX
          saveTriggerEvent(crId, def.id).catch(err => {
            if (import.meta.env.DEV) console.warn('[Prototype] saveTriggerEvent failed:', err)
          })
          if (import.meta.env.DEV) {
            console.info(`[Prototype] Trigger fired: "${def.name}" (frame: "${frameName}")`)
          }
        }
      })
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [loading, error, chapter, pos])

  // ── Timer tick ───────────────────────────────────────────────
  useEffect(() => {
    if (loading || error) return
    startTimeRef.current = Date.now()
    tickRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
    return () => clearInterval(tickRef.current)
  }, [loading, error])

  // ── Auto-hide MC bar ─────────────────────────────────────────
  const scheduleMcHide = useCallback(() => {
    clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => setMcVisible(false), MC_AUTO_HIDE_MS)
  }, [])

  useEffect(() => {
    if (!loading && !error) scheduleMcHide()
    return () => clearTimeout(hideTimerRef.current)
  }, [loading, error, scheduleMcHide])

  // Show bar when mouse approaches bottom 15% of screen
  useEffect(() => {
    function handleMouseMove(e) {
      const threshold = window.innerHeight * 0.85
      if (e.clientY > threshold) {
        setMcVisible(true)
        scheduleMcHide()
      }
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [scheduleMcHide])

  // ── Finish handler ────────────────────────────────────────────
  async function handleFinish(outcome) {
    if (finishing) return
    setFinishing(true)
    clearInterval(tickRef.current)
    clearTimeout(hideTimerRef.current)

    const durationMs = Date.now() - startTimeRef.current
    const crId = sessionStorage.getItem(`cr_${pos}`)

    try {
      await finishChapterResponse(crId, outcome, durationMs)

      // Stop voice recording and upload if active
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive' && crId) {
        await new Promise(resolve => {
          mediaRecorderRef.current.onstop = resolve
          mediaRecorderRef.current.stop()
        })
        if (micStreamRef.current) {
          micStreamRef.current.getTracks().forEach(t => t.stop())
        }

        if (audioChunksRef.current.length > 0) {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          const sessionId = sessionStorage.getItem('session_id') || 'unknown'
          const path = `${studyId}/${sessionId}/${chapter.id}.webm`

          try {
            const { error: uploadErr } = await supabase.storage
              .from('voice-recordings')
              .upload(path, blob, { contentType: 'audio/webm', upsert: true })

            if (!uploadErr) {
              await saveVoiceRecording(crId, path, durationMs)
            }
          } catch {
            // Upload failure is non-blocking — continue to survey
          }
        }
      }

      navigate(`/s/${studyId}/ch/${pos}/survey`)
    } catch (e) {
      setError(e.message)
      setFinishing(false)
    }
  }

  function formatTime(secs) {
    const m = String(Math.floor(secs / 60)).padStart(2, '0')
    const s = String(secs % 60).padStart(2, '0')
    return `${m}:${s}`
  }

  function getFigmaUrl() {
    const url = chapter?.figma_url || null
    if (!url) return null
    if (chapter.is_figma_make) return url                  // Figma Make — use as-is
    if (url.includes('figma.com/embed')) return url        // already an embed URL
    if (url.includes('figma.com/proto'))                   // standard proto → wrap
      return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`
    return url                                             // any other URL — use as-is
  }

  if (loading) return <Loading />
  if (error)   return <ErrorState message={error} />

  const figmaUrl = getFigmaUrl()
  const voiceActive = study?.enable_voice_recording && mediaRecorderRef.current?.state === 'recording'

  return (
    <div className="fixed inset-0 bg-[#0A1628] overflow-hidden no-scroll">

      {/* ── Figma iframe ── */}
      {figmaUrl ? (
        <iframe
          ref={iframeRef}
          src={figmaUrl}
          className="absolute inset-0 w-full h-full border-0"
          allowFullScreen
          title="Prototype"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-muted font-mono text-sm">No Figma URL configured for this task.</p>
        </div>
      )}

      {/* ── Mic denied toast ── */}
      {micToast === 'denied' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40
          bg-surface border border-warn/30 rounded-lg px-4 py-2.5
          font-mono text-xs text-warn shadow-lg">
          Mic unavailable — audio not recorded
        </div>
      )}

      {/* ── Invisible bottom trigger zone ── */}
      <div
        className="absolute bottom-0 left-0 right-0 h-16"
        style={{ zIndex: 20 }}
        onMouseEnter={() => { setMcVisible(true); scheduleMcHide() }}
      />

      {/* ── Mission Control Bar ── */}
      <div
        className={`
          absolute bottom-0 left-0 right-0 z-30
          transition-transform duration-200 ease-out
          ${mcVisible ? 'translate-y-0' : 'translate-y-full'}
        `}
        style={{ backdropFilter: 'blur(16px)' }}
      >
        {/* Collapsed pill */}
        {!mcVisible && (
          <div
            className="absolute bottom-full left-1/2 -translate-x-1/2 cursor-pointer
              bg-bg/80 border border-border border-b-0 rounded-t-lg
              px-4 py-1.5 font-mono text-[9px] text-muted hover:text-text transition-colors"
            onClick={() => { setMcVisible(true); scheduleMcHide() }}
          >
            ▲ mission control
          </div>
        )}

        <div
          className="bg-bg/90 border-t border-accent/30 px-4 py-3 flex items-center gap-3"
          onMouseEnter={() => clearTimeout(hideTimerRef.current)}
          onMouseLeave={scheduleMcHide}
        >
          {/* Task + timer */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-mono text-[9px] text-accent tracking-wider">
                TASK {pos}
              </span>
              <span className="text-[11px] text-text truncate">
                {chapter.task_text}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="rec-dot" />
              <span className="font-mono text-[10px] text-accent">{formatTime(elapsed)}</span>
              <span className="font-mono text-[9px] text-muted">
                {voiceActive ? 'recording + audio' : 'recording'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <button
            onClick={() => handleFinish('gave_up')}
            disabled={finishing}
            className="flex-shrink-0 px-3 py-1.5 rounded text-[10px] font-bold
              text-warn border border-warn/30 bg-warn/10
              hover:bg-warn/20 transition-colors disabled:opacity-40"
          >
            ✗ Can't complete this
          </button>
          <button
            onClick={() => handleFinish('completed')}
            disabled={finishing}
            className="flex-shrink-0 px-3 py-1.5 rounded text-[10px] font-bold
              bg-accent text-bg hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            ✓ Done
          </button>
        </div>
      </div>

    </div>
  )
}

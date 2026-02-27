import { useEffect, useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  renameStudy, closeStudy, archiveStudy, unarchiveStudy,
  resetStudyData, deleteStudy, duplicateStudy, updateStudySettings, getSessionCount,
} from '../../lib/db'
import { Card, Label, Btn, ErrorState } from '../../components/UI'
import QRCode from 'qrcode'

function useAdminGuard() {
  const navigate = useNavigate()
  useEffect(() => {
    if (!sessionStorage.getItem('admin_authed')) navigate('/admin')
  }, [navigate])
}

// ── SVG icon primitives (no external deps) ──────────────────
function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <path d="M1 1l10 10M11 1L1 11" />
    </svg>
  )
}

function DotsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <circle cx="2.5" cy="7" r="1.2" />
      <circle cx="7"   cy="7" r="1.2" />
      <circle cx="11.5" cy="7" r="1.2" />
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 7h9M8 3.5L11.5 7 8 10.5" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <circle cx="7.5" cy="7.5" r="2.5" />
      <path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M3.05 3.05l1.06 1.06M10.9 10.9l1.05 1.05M10.9 4.1l1.05-1.05M3.05 11.95l1.06-1.06" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 9.5A6 6 0 0 1 4.5 2a6 6 0 1 0 7.5 7.5z" />
    </svg>
  )
}

// ── Skeleton loading ─────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-bg p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header skeleton */}
        <div className="flex items-end justify-between mb-8">
          <div className="flex flex-col gap-2">
            <div className="skeleton h-2.5 w-36 rounded-full" />
            <div className="skeleton h-6 w-24 rounded-md" />
          </div>
          <div className="skeleton h-9 w-28 rounded-md" />
        </div>
        {/* Tabs skeleton */}
        <div className="flex gap-1 mb-6">
          <div className="skeleton h-7 w-20 rounded-md" />
          <div className="skeleton h-7 w-20 rounded-md" />
        </div>
        {/* Cards skeleton */}
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-surface border border-border rounded-xl p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="skeleton h-3.5 w-40 rounded-full" />
                    <div className="skeleton h-4 w-12 rounded" />
                  </div>
                  <div className="flex gap-4">
                    <div className="skeleton h-2.5 w-14 rounded-full" />
                    <div className="skeleton h-2.5 w-18 rounded-full" />
                  </div>
                </div>
                <div className="skeleton h-4 w-4 rounded flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────
function EmptyState({ tab, onNew }) {
  return (
    <div className="py-16 flex flex-col items-start gap-4">
      <div className="w-10 h-10 rounded-lg border border-border flex items-center justify-center">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
          <rect x="2" y="2" width="14" height="14" rx="2" />
          <path d="M6 9h6M9 6v6" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-text">
          {tab === 'active' ? 'No studies yet' : 'Nothing archived'}
        </p>
        <p className="text-xs text-muted mt-0.5">
          {tab === 'active'
            ? 'Create a study to start collecting participant feedback.'
            : 'Archived studies will appear here.'}
        </p>
      </div>
      {tab === 'active' && (
        <Btn onClick={onNew}>Create first study</Btn>
      )}
    </div>
  )
}

// ── Invite Modal ──────────────────────────────────────────────
function InviteModal({ study, onClose }) {
  const url = `${window.location.origin}/s/${study.id}`
  const canvasRef = useRef(null)
  const [copied, setCopied] = useState(false)
  const [expiry, setExpiry] = useState('never')
  const [maxResp, setMaxResp] = useState(study.max_responses ?? '')
  const [sessionCount, setSessionCount] = useState(null)

  useEffect(() => {
    if (QRCode && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, { width: 180, margin: 1 }).catch(() => {})
    }
    getSessionCount(study.id).then(setSessionCount).catch(() => {})
  }, [url, study.id])

  function copy() {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleExpiryChange(val) {
    setExpiry(val)
    const days = { '7': 7, '14': 14, '30': 30, 'never': null }
    const d = days[val]
    const expires = d ? new Date(Date.now() + d * 86400000).toISOString() : null
    await updateStudySettings(study.id, { invite_expires_at: expires }).catch(() => {})
  }

  async function handleMaxRespBlur() {
    const n = maxResp === '' ? null : parseInt(maxResp) || null
    await updateStudySettings(study.id, { max_responses: n }).catch(() => {})
  }

  return (
    <div className="fixed inset-0 bg-bg/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
      <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-sm flex flex-col gap-5 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)]">

        <div className="flex items-center justify-between">
          <Label>Invite Link</Label>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded text-muted hover:text-text hover:bg-border/60 transition-colors active:scale-95"
          >
            <XIcon />
          </button>
        </div>

        {/* URL + copy */}
        <div className="flex gap-2">
          <input
            readOnly
            value={url}
            className="flex-1 bg-bg border border-border rounded-md px-3 py-2 text-xs text-muted font-mono focus:outline-none"
          />
          <Btn onClick={copy} variant="secondary" className="flex-shrink-0 text-xs px-3 py-2">
            {copied ? 'Copied' : 'Copy'}
          </Btn>
        </div>

        {/* QR code */}
        <div className="flex justify-center">
          <canvas ref={canvasRef} className="rounded-lg border border-border" />
        </div>

        {/* Expiry */}
        <div>
          <Label className="mb-1.5 block">Link expires</Label>
          <select
            value={expiry}
            onChange={e => handleExpiryChange(e.target.value)}
            className="w-full bg-bg border border-border rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:border-accent/50"
          >
            <option value="never">Never</option>
            <option value="7">7 days</option>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
          </select>
        </div>

        {/* Max responses */}
        <div>
          <Label className="mb-1.5 block">
            Max responses
            {sessionCount !== null && (
              <span className="ml-2 text-accent">{sessionCount} collected so far</span>
            )}
          </Label>
          <input
            type="number"
            min={1}
            placeholder="Unlimited"
            value={maxResp}
            onChange={e => setMaxResp(e.target.value)}
            onBlur={handleMaxRespBlur}
            className="w-full bg-bg border border-border rounded-md px-3 py-2 text-sm text-text placeholder-muted focus:outline-none focus:border-accent/50"
          />
        </div>

      </div>
    </div>
  )
}

// ── Kebab menu ────────────────────────────────────────────────
function KebabMenu({ study, onRefresh, onInvite, navigate }) {
  const [open, setOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameVal, setRenameVal] = useState(study.title)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  async function doRename() {
    if (renameVal.trim() && renameVal.trim() !== study.title) {
      await renameStudy(study.id, renameVal.trim()).catch(() => {})
      onRefresh()
    }
    setRenaming(false)
  }

  async function doDuplicate() {
    setOpen(false)
    try {
      const newId = await duplicateStudy(study.id)
      navigate(`/admin/studies/${newId}`)
    } catch (e) {
      alert('Duplicate failed: ' + e.message)
    }
  }

  async function doClose() {
    setOpen(false)
    if (!window.confirm('Close this session? Reviewers will no longer be able to participate.')) return
    await closeStudy(study.id).catch(() => {})
    onRefresh()
  }

  async function doReset() {
    setOpen(false)
    const input = window.prompt(`Type "${study.title}" to confirm resetting all data:`)
    if (input !== study.title) return
    await resetStudyData(study.id).catch(() => {})
    onRefresh()
  }

  async function doArchive() {
    setOpen(false)
    if (!window.confirm('Archive this study?')) return
    await archiveStudy(study.id).catch(() => {})
    onRefresh()
  }

  async function doUnarchive() {
    setOpen(false)
    await unarchiveStudy(study.id).catch(() => {})
    onRefresh()
  }

  async function doDelete() {
    setOpen(false)
    if (!window.confirm(`Delete "${study.title}"? This cannot be undone.`)) return
    if (!window.confirm('Are you sure? All data will be permanently deleted.')) return
    await deleteStudy(study.id).catch(() => {})
    onRefresh()
  }

  return (
    <div className="relative flex-shrink-0" ref={menuRef}>
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(v => !v) }}
        className="w-7 h-7 flex items-center justify-center rounded text-muted
          hover:text-text hover:bg-border/60 transition-colors active:scale-95"
      >
        <DotsIcon />
      </button>

      {open && (
        <div className="absolute right-0 top-8 bg-surface border border-border rounded-xl
          shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)] z-20 py-1.5 min-w-[170px]">

          {renaming ? (
            <div className="px-3 py-2" onClick={e => e.preventDefault()}>
              <input
                autoFocus
                className="w-full bg-bg border border-border rounded px-2 py-1 text-xs text-text focus:outline-none focus:border-accent/50"
                value={renameVal}
                onChange={e => setRenameVal(e.target.value)}
                onBlur={doRename}
                onKeyDown={e => { if (e.key === 'Enter') doRename(); if (e.key === 'Escape') setRenaming(false) }}
              />
            </div>
          ) : (
            <MenuItem onClick={() => { setRenaming(true) }}>Rename</MenuItem>
          )}

          <MenuItem onClick={() => { setOpen(false); onInvite() }}>Copy invite link</MenuItem>
          <MenuItem onClick={doDuplicate}>Duplicate</MenuItem>

          {study.is_active && (
            <MenuItem onClick={doClose} warn>Close session</MenuItem>
          )}

          <MenuItem onClick={doReset} warn>Reset data</MenuItem>

          {study.is_archived ? (
            <MenuItem onClick={doUnarchive}>Unarchive</MenuItem>
          ) : (
            <MenuItem onClick={doArchive}>Archive</MenuItem>
          )}

          {study.is_archived && (
            <MenuItem onClick={doDelete} warn>Delete</MenuItem>
          )}
        </div>
      )}
    </div>
  )
}

function MenuItem({ children, onClick, warn = false }) {
  return (
    <button
      onClick={e => { e.preventDefault(); e.stopPropagation(); onClick() }}
      className={`w-full text-left px-4 py-2 text-xs transition-colors active:scale-[0.98]
        ${warn ? 'text-warn hover:bg-warn/10' : 'text-text hover:bg-border/50'}`}
    >
      {children}
    </button>
  )
}

// ── Main Dashboard ────────────────────────────────────────────
export default function AdminDashboard() {
  useAdminGuard()
  const navigate    = useNavigate()
  const [studies, setStudies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [tab, setTab]         = useState('active')
  const [inviteStudy, setInviteStudy] = useState(null)
  const [theme, setTheme] = useState(() => localStorage.getItem('admin_theme') || 'light')

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light'
    if (next === 'dark') document.documentElement.dataset.theme = 'dark'
    else delete document.documentElement.dataset.theme
    localStorage.setItem('admin_theme', next)
    setTheme(next)
  }

  function loadStudies() {
    supabase
      .from('study_summary')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) throw error
        setStudies(data || [])
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadStudies() }, [])

  if (loading) return <DashboardSkeleton />
  if (error)   return <ErrorState message={error} />

  const activeStudies   = studies.filter(s => !s.is_archived)
  const archivedStudies = studies.filter(s => s.is_archived)
  const displayed = tab === 'active' ? activeStudies : archivedStudies

  return (
    <div className="min-h-screen bg-bg p-8">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="font-mono text-[10px] tracking-widest uppercase text-accent mb-1.5">
              Admin · Tipalti UX Research
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-text">Studies</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="w-8 h-8 flex items-center justify-center rounded-md border border-border text-muted hover:text-text hover:border-muted transition-colors active:scale-95"
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? <MoonIcon /> : <SunIcon />}
            </button>
            <Btn onClick={() => navigate('/admin/studies/new')}>
              New Study
            </Btn>
          </div>
        </div>

        {/* Segmented control */}
        <div className="inline-flex items-center bg-border/70 rounded-lg p-0.5 mb-6">
          {['active', 'archived'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-xs font-mono transition-all capitalize
                ${tab === t
                  ? 'bg-surface text-text font-semibold shadow-[0_1px_4px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.07)]'
                  : 'text-muted hover:text-text font-medium'
                }`}
            >
              {t}
              <span className="ml-1.5 opacity-40 tabular-nums">
                {t === 'active' ? activeStudies.length : archivedStudies.length}
              </span>
            </button>
          ))}
        </div>

        {/* Studies list */}
        {displayed.length === 0 ? (
          <EmptyState tab={tab} onNew={() => navigate('/admin/studies/new')} />
        ) : (
          <div className="flex flex-col gap-3">
            {displayed.map(s => (
              <div key={s.id} className="relative group">
                <Link to={`/admin/studies/${s.id}`}>
                  <Card className="
                    hover:border-accent/30
                    hover:shadow-[0_4px_20px_-4px_rgba(0,200,200,0.07)]
                    transition-all duration-200 cursor-pointer pr-12
                  ">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <h2 className="text-sm font-semibold truncate text-text">{s.title}</h2>
                          {s.is_archived ? (
                            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-muted/10 text-muted border border-muted/20">
                              archived
                            </span>
                          ) : (
                            <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded
                              ${s.is_active
                                ? 'bg-accent/10 text-accent border border-accent/20'
                                : 'bg-border/60 text-muted border border-border'
                              }`}>
                              {s.is_active ? 'active' : 'closed'}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-4">
                          <span className="font-mono text-[10px] text-muted">
                            {s.chapter_count} task{s.chapter_count !== 1 ? 's' : ''}
                          </span>
                          <span className="font-mono text-[10px] text-muted">
                            {s.total_sessions ?? 0} sessions
                          </span>
                          {s.completion_rate_pct != null && (
                            <span className="font-mono text-[10px] text-accent">
                              {s.completion_rate_pct}% complete
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-muted flex-shrink-0 opacity-40 group-hover:opacity-100 group-hover:text-accent transition-all duration-200">
                        <ArrowRightIcon />
                      </span>
                    </div>
                  </Card>
                </Link>

                {/* Kebab menu — absolutely positioned over card */}
                <div className="absolute top-3 right-3 z-10">
                  <KebabMenu
                    study={s}
                    onRefresh={loadStudies}
                    onInvite={() => setInviteStudy(s)}
                    navigate={navigate}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Invite modal */}
      {inviteStudy && (
        <InviteModal
          study={inviteStudy}
          onClose={() => setInviteStudy(null)}
        />
      )}
    </div>
  )
}

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createStudyFromSpec } from '../../lib/db'
import { validateImportJson, normalizeImportSpec } from '../../lib/importSchema'
import { Card, Label, Btn } from '../../components/UI'

function useAdminGuard() {
  const navigate = useNavigate()
  useEffect(() => {
    if (!sessionStorage.getItem('admin_authed')) navigate('/admin')
  }, [navigate])
}

function getJsonSyntaxError(text) {
  if (!text.trim()) return null
  try { JSON.parse(text); return null } catch (e) {
    const msg = e.message
    // Firefox: "JSON.parse: ... at line N column M ..."
    const ffMatch = msg.match(/at line (\d+)/)
    if (ffMatch) {
      const clean = msg.split(' at line')[0].replace(/^JSON\.parse:\s*/, '')
      return `Line ${ffMatch[1]}: ${clean}`
    }
    // Chrome/V8: "... at position N"
    const posMatch = msg.match(/position (\d+)/)
    if (posMatch) {
      const line = text.slice(0, parseInt(posMatch[1])).split('\n').length
      return `Line ${line}: unexpected token`
    }
    return msg
  }
}

const SCHEMA_EXAMPLE = `{
  "title": "Study title (required)",
  "settings": {
    "figma_make": true,
    "voice_recording": false,
    "default_url": "https://… (required if any chapter omits figma_url)"
  },
  "screener_questions": [
    { "type": "yes_no|multiple_choice|text", "text": "…", "options": ["…"] }
  ],
  "chapters": [
    {
      "position": 1,
      "title": "Task title",
      "brief": "Instruction shown to participant",
      "figma_url": "https://… (optional — falls back to settings.default_url)",
      "triggers": [
        {
          "name": "Label shown in dashboard",
          "event_name": "Must match data-ut-trigger value exactly",
          "action": "none|complete"
        }
      ],
      "survey_questions": [
        {
          "type": "rating|text|opinion_scale|multiple_choice|yes_no|nps",
          "text": "Question prompt",
          "options": ["Only required for multiple_choice"]
        }
      ]
    }
  ]
}`

export default function StudyImport() {
  useAdminGuard()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [jsonText,     setJsonText]     = useState('')
  const [syntaxError,  setSyntaxError]  = useState(null)
  const [schemaErrors, setSchemaErrors] = useState([])
  const [submitting,   setSubmitting]   = useState(false)
  const [submitError,  setSubmitError]  = useState(null)

  useEffect(() => {
    setSyntaxError(getJsonSyntaxError(jsonText))
    setSchemaErrors([])
  }, [jsonText])

  function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = evt => setJsonText(evt.target.result)
    reader.readAsText(file)
    e.target.value = ''
  }

  async function handleSubmit() {
    if (!jsonText.trim() || syntaxError) return

    let parsed
    try { parsed = JSON.parse(jsonText) } catch { return }

    const errors = validateImportJson(parsed)
    if (errors.length > 0) { setSchemaErrors(errors); return }

    setSubmitting(true)
    setSubmitError(null)
    try {
      const spec  = normalizeImportSpec(parsed)
      const newId = await createStudyFromSpec(spec)
      navigate(`/admin/studies/${newId}/edit`)
    } catch (e) {
      setSubmitError(e.message)
      setSubmitting(false)
    }
  }

  const inputClass = `
    w-full bg-bg border border-border rounded-md px-3 py-2
    text-sm text-text placeholder-muted focus:outline-none
    focus:border-accent/50 transition-colors
  `

  const hasContent = jsonText.trim().length > 0
  const canSubmit  = hasContent && !syntaxError && !submitting

  return (
    <div className="min-h-screen bg-bg p-8">
      <div className="max-w-2xl mx-auto">

        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="text-muted hover:text-text text-sm transition-colors"
          >
            ← Dashboard
          </button>
          <div>
            <div className="font-mono text-[10px] tracking-widest uppercase text-accent mb-0.5">
              Import
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Import Study from JSON</h1>
          </div>
        </div>

        <div className="flex flex-col gap-6">

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">JSON Spec</h2>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Btn
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs py-1.5 px-3"
                >
                  Upload .json
                </Btn>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <textarea
                className={`${inputClass} font-mono text-xs leading-relaxed resize-y min-h-[320px] ${
                  syntaxError && hasContent ? 'border-warn focus:border-warn' : ''
                }`}
                placeholder={"Paste your study JSON here…\n\nor click \"Upload .json\" above"}
                value={jsonText}
                onChange={e => setJsonText(e.target.value)}
                spellCheck={false}
              />
              {syntaxError && hasContent && (
                <p className="text-warn font-mono text-[11px] flex items-center gap-1.5">
                  <span className="opacity-60">⚠</span> {syntaxError}
                </p>
              )}
            </div>

            <details className="mt-4 group">
              <summary className="cursor-pointer text-xs text-muted hover:text-text transition-colors font-mono list-none flex items-center gap-1.5 select-none">
                <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                See schema
              </summary>
              <div className="mt-3 bg-bg border border-border rounded-lg overflow-hidden">
                <div className="px-4 py-2 border-b border-border flex items-center justify-between">
                  <Label>Expected shape</Label>
                  <button
                    className="text-[10px] font-mono text-muted hover:text-text transition-colors"
                    onClick={() => setJsonText(SCHEMA_EXAMPLE)}
                  >
                    Use as template
                  </button>
                </div>
                <pre className="text-[11px] font-mono text-muted leading-relaxed p-4 overflow-x-auto whitespace-pre">
                  {SCHEMA_EXAMPLE}
                </pre>
              </div>
            </details>
          </Card>

          {schemaErrors.length > 0 && (
            <Card className="border-warn/30 bg-warn/5">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold text-warn">
                  {schemaErrors.length} validation error{schemaErrors.length !== 1 ? 's' : ''}
                </h3>
              </div>
              <div className="flex flex-col gap-2">
                {schemaErrors.map((e, i) => (
                  <div key={i} className="flex gap-3 text-xs font-mono">
                    <span className="text-muted shrink-0">{e.path}</span>
                    <span className="text-warn">{e.message}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {submitError && (
            <p className="text-warn text-sm font-mono">{submitError}</p>
          )}

          <div className="flex justify-end gap-3 pb-8">
            <Btn variant="secondary" onClick={() => navigate('/admin/dashboard')}>
              Cancel
            </Btn>
            <Btn onClick={handleSubmit} disabled={!canSubmit}>
              {submitting ? 'Importing…' : 'Import Study →'}
            </Btn>
          </div>

        </div>
      </div>
    </div>
  )
}

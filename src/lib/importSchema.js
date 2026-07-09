const VALID_SURVEY_KINDS  = new Set(['rating', 'text', 'opinion_scale', 'multiple_choice', 'yes_no', 'nps'])
const VALID_SCREENER_KINDS = new Set(['yes_no', 'multiple_choice', 'text'])
const VALID_ACTIONS        = new Set(['none', 'complete'])

export function validateImportJson(raw) {
  const errors = []
  function err(path, message) { errors.push({ path, message }) }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    err('(root)', 'must be a JSON object')
    return errors
  }

  if (typeof raw.title !== 'string' || !raw.title.trim()) {
    err('title', 'required')
  }

  if (!Array.isArray(raw.chapters) || raw.chapters.length === 0) {
    err('chapters', 'required — at least one chapter')
    return errors
  }

  if (raw.chapters.length > 5) {
    err('chapters', `max 5 chapters, got ${raw.chapters.length}`)
  }

  const defaultUrl = raw.settings?.default_url?.trim()
  const positions  = new Set()

  raw.chapters.forEach((ch, i) => {
    const base = `chapters[${i}]`

    if (ch == null || typeof ch !== 'object') { err(base, 'must be an object'); return }

    if (!Number.isInteger(ch.position) || ch.position < 1 || ch.position > 5) {
      err(`${base}.position`, 'must be an integer 1–5')
    } else if (positions.has(ch.position)) {
      err(`${base}.position`, `duplicate — position ${ch.position} already used`)
    } else {
      positions.add(ch.position)
    }

    if (typeof ch.title !== 'string' || !ch.title.trim())  err(`${base}.title`, 'required')
    if (typeof ch.brief !== 'string' || !ch.brief.trim())  err(`${base}.brief`, 'required')

    const chUrl = typeof ch.figma_url === 'string' ? ch.figma_url.trim() : ''
    if (!chUrl && !defaultUrl) {
      err(`${base}.figma_url`, 'required — no chapter URL and no settings.default_url')
    }

    if (ch.triggers != null) {
      if (!Array.isArray(ch.triggers)) {
        err(`${base}.triggers`, 'must be an array')
      } else {
        ch.triggers.forEach((t, ti) => {
          const tb = `${base}.triggers[${ti}]`
          if (typeof t.name !== 'string' || !t.name.trim())             err(`${tb}.name`, 'required')
          if (typeof t.event_name !== 'string' || !t.event_name.trim()) err(`${tb}.event_name`, 'required')
          if (t.action != null && !VALID_ACTIONS.has(t.action))         err(`${tb}.action`, 'must be "none" or "complete"')
        })
      }
    }

    if (ch.survey_questions != null) {
      if (!Array.isArray(ch.survey_questions)) {
        err(`${base}.survey_questions`, 'must be an array')
      } else {
        ch.survey_questions.forEach((q, qi) => {
          const qb = `${base}.survey_questions[${qi}]`
          if (!VALID_SURVEY_KINDS.has(q.type)) err(`${qb}.type`, `must be one of: ${[...VALID_SURVEY_KINDS].join(', ')}`)
          if (typeof q.text !== 'string' || !q.text.trim()) err(`${qb}.text`, 'required')
          if (q.type === 'multiple_choice' && (!Array.isArray(q.options) || q.options.length === 0)) {
            err(`${qb}.options`, 'required for multiple_choice')
          }
        })
      }
    }
  })

  if (raw.screener_questions != null) {
    if (!Array.isArray(raw.screener_questions)) {
      err('screener_questions', 'must be an array')
    } else {
      raw.screener_questions.forEach((q, i) => {
        const base = `screener_questions[${i}]`
        if (!VALID_SCREENER_KINDS.has(q.type)) err(`${base}.type`, 'must be one of: yes_no, multiple_choice, text')
        if (typeof q.text !== 'string' || !q.text.trim()) err(`${base}.text`, 'required')
        if (q.type === 'multiple_choice' && (!Array.isArray(q.options) || q.options.length === 0)) {
          err(`${base}.options`, 'required for multiple_choice')
        }
      })
    }
  }

  return errors
}

export function normalizeImportSpec(raw) {
  const defaultUrl  = raw.settings?.default_url?.trim() || null
  const isFigmaMake = raw.settings?.figma_make ?? true

  return {
    title:                  raw.title.trim(),
    enable_voice_recording: raw.settings?.voice_recording ?? false,
    chapters: [...raw.chapters]
      .sort((a, b) => a.position - b.position)
      .map(ch => ({
        position:  ch.position,
        title:     ch.title.trim(),
        task_text: ch.brief.trim(),
        figma_url: ch.figma_url?.trim() || defaultUrl,
        is_figma_make: isFigmaMake,
        triggers: (ch.triggers || []).map(t => ({
          name:       t.name.trim(),
          frame_name: t.event_name.trim(),
          action:     t.action || 'none',
        })),
        survey_questions: (ch.survey_questions || []).map(q => ({
          kind:         q.type,
          prompt:       q.text.trim(),
          options:      q.type === 'multiple_choice' ? q.options.map(o => String(o).trim()) : null,
          scale_labels: null,
        })),
      })),
    screener_questions: (raw.screener_questions || []).map(q => ({
      kind:    q.type,
      prompt:  q.text.trim(),
      options: q.type === 'multiple_choice' ? q.options.map(o => String(o).trim()) : null,
    })),
  }
}

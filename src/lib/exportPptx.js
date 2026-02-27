// ── Design tokens (matches Tailwind config) ───────────────────────────────────
const C = {
  bg:      '0c0c0e',
  surface: '16161a',
  border:  '26262e',
  accent:  'c8f055',
  text:    'e8e8e4',
  muted:   '5a5a62',
  warn:    'f0855a',
  success: '4ade80',
}

const MONO = 'Courier New'
const SANS = 'Calibri'
const W    = 13.33  // slide width  (LAYOUT_WIDE)
const H    = 7.5    // slide height

// ── Helpers ───────────────────────────────────────────────────────────────────

function bg(slide) {
  slide.addShape('rect', {
    x: 0, y: 0, w: W, h: H,
    fill: { color: C.bg },
    line: { color: C.bg, width: 0 },
  })
}

function surfaceBox(slide, x, y, w, h) {
  slide.addShape('rect', {
    x, y, w, h,
    fill: { color: C.surface },
    line: { color: C.border, width: 1 },
  })
}

function label(slide, text, x, y, w, extraOpts = {}) {
  slide.addText(text, {
    x, y, w, h: 0.28,
    fontSize: 7.5, bold: true, color: C.muted,
    fontFace: MONO, charSpacing: 2.5,
    ...extraOpts,
  })
}

function accentLine(slide, x, y, w) {
  slide.addShape('rect', {
    x, y, w, h: 0.04,
    fill: { color: C.accent },
    line: { color: C.accent, width: 0 },
  })
}

/** Truncate text to maxLen chars */
function trunc(str, maxLen) {
  if (!str) return ''
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str
}

// ── Slide builders ────────────────────────────────────────────────────────────

function addTitleSlide(prs, study, results) {
  const slide = prs.addSlide()
  bg(slide)

  // Left accent strip
  slide.addShape('rect', {
    x: 0, y: 0, w: 0.08, h: H,
    fill: { color: C.accent },
    line: { color: C.accent, width: 0 },
  })

  // Eyebrow
  slide.addText('USER STUDY REPORT', {
    x: 0.45, y: 2.0, w: 10, h: 0.32,
    fontSize: 9, bold: true, color: C.accent, fontFace: MONO, charSpacing: 4,
  })

  // Title
  slide.addText(study.title, {
    x: 0.45, y: 2.45, w: 10.5, h: 1.8,
    fontSize: 34, bold: true, color: C.text, fontFace: SANS, wrap: true,
  })

  // Description
  if (study.description) {
    slide.addText(study.description, {
      x: 0.45, y: 4.35, w: 9, h: 0.7,
      fontSize: 12, color: C.muted, fontFace: SANS, wrap: true,
    })
  }

  // Stat boxes
  const totalSessions = results.length
  const completed     = results.filter(s => s.completed_at).length
  const rate          = totalSessions ? Math.round(completed / totalSessions * 100) : 0

  const statBoxes = [
    { l: 'PARTICIPANTS',   v: String(totalSessions) },
    { l: 'COMPLETED',      v: String(completed) },
    { l: 'COMPLETION',     v: `${rate}%`,                accent: true },
    { l: 'CHAPTERS',       v: String(study.chapter_count) },
  ]

  statBoxes.forEach(({ l: lbl, v, accent }, i) => {
    const bx = 0.45 + i * 3.2
    surfaceBox(slide, bx, 5.65, 3.05, 1.2)
    slide.addText(v, {
      x: bx + 0.18, y: 5.74, w: 2.7, h: 0.52,
      fontSize: 22, bold: true, color: accent ? C.accent : C.text, fontFace: MONO,
    })
    slide.addText(lbl, {
      x: bx + 0.18, y: 6.3, w: 2.7, h: 0.26,
      fontSize: 7, color: C.muted, fontFace: MONO, charSpacing: 2,
    })
  })

  // Date footer
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  slide.addText(dateStr, {
    x: 0.45, y: 7.12, w: 8, h: 0.25,
    fontSize: 8, color: C.muted, fontFace: MONO,
  })
}

function addOverviewSlide(prs, study, stats) {
  const slide = prs.addSlide()
  bg(slide)

  // Section label
  label(slide, 'STUDY OVERVIEW', 0.4, 0.32, 8, { color: C.accent })
  slide.addText('Study Overview', {
    x: 0.4, y: 0.65, w: 12, h: 0.55,
    fontSize: 22, bold: true, color: C.text, fontFace: SANS,
  })
  accentLine(slide, 0.4, 1.22, 2.8)

  // Chapter rows
  const ROW_H = Math.min(0.92, (H - 1.55) / study.chapters.length)
  study.chapters.forEach((ch, i) => {
    const chStat = stats.find(s => s.position === ch.position) || {}
    const ry = 1.42 + i * ROW_H

    surfaceBox(slide, 0.4, ry, W - 0.8, ROW_H - 0.08)

    // Accent number badge
    slide.addShape('rect', {
      x: 0.4, y: ry, w: 0.52, h: ROW_H - 0.08,
      fill: { color: C.accent },
      line: { color: C.accent, width: 0 },
    })
    slide.addText(String(ch.position), {
      x: 0.4, y: ry + (ROW_H - 0.08) / 2 - 0.2, w: 0.52, h: 0.4,
      fontSize: 14, bold: true, color: '0c0c0e', fontFace: MONO, align: 'center',
    })

    // Chapter info
    slide.addText(trunc(ch.title || `Chapter ${ch.position}`, 60), {
      x: 1.08, y: ry + 0.1, w: 7.8, h: 0.3,
      fontSize: 11, bold: true, color: C.text, fontFace: SANS,
    })
    slide.addText(trunc(ch.task_text, 100), {
      x: 1.08, y: ry + 0.44, w: 7.8, h: 0.28,
      fontSize: 8.5, color: C.muted, fontFace: SANS,
    })

    // Stats (right-aligned)
    const metaParts = [
      `${chStat.attempts ?? 0} attempts`,
      `${chStat.success_rate_pct ?? 0}% success`,
      chStat.avg_duration_sec ? `${chStat.avg_duration_sec}s avg` : 'no data',
    ]
    slide.addText(metaParts.join('  ·  '), {
      x: 9.1, y: ry + (ROW_H - 0.08) / 2 - 0.14, w: 4.0, h: 0.28,
      fontSize: 8.5, color: C.accent, fontFace: MONO, align: 'right',
    })
  })
}

/**
 * Render a horizontal bar for a distribution item in the left panel.
 * Returns new surveyY after adding the row.
 */
function addDistBar(slide, x, y, w, label_text, count, total, color) {
  const pct   = total > 0 ? count / total : 0
  const fillW = Math.max(0.01, (w - 1.6) * pct)

  slide.addText(trunc(label_text, 22), {
    x, y, w: 1.55, h: 0.22,
    fontSize: 7.5, color: C.muted, fontFace: MONO,
  })
  // Track
  slide.addShape('rect', {
    x: x + 1.6, y: y + 0.04, w: w - 1.6, h: 0.12,
    fill: { color: C.border }, line: { color: C.border, width: 0 },
  })
  // Fill
  slide.addShape('rect', {
    x: x + 1.6, y: y + 0.04, w: fillW, h: 0.12,
    fill: { color: color || C.accent }, line: { color: color || C.accent, width: 0 },
  })
  // Pct label
  slide.addText(`${Math.round(pct * 100)}%`, {
    x: x + w + 0.05, y: y, w: 0.45, h: 0.22,
    fontSize: 7, color: C.muted, fontFace: MONO,
  })
}

function addChapterSlide(prs, chapter, chStat, results, triggerDefs, triggerEvents) {
  const slide = prs.addSlide()
  bg(slide)

  const pos = chapter.position

  // ── Header bar ────────────────────────────────────────────────
  slide.addShape('rect', {
    x: 0, y: 0, w: W, h: 1.38,
    fill: { color: C.surface },
    line: { color: C.border, width: 1 },
  })
  // Accent left strip in header
  slide.addShape('rect', {
    x: 0, y: 0, w: 0.08, h: 1.38,
    fill: { color: C.accent },
    line: { color: C.accent, width: 0 },
  })

  label(slide, `CHAPTER ${pos}`, 0.35, 0.17, 3, { color: C.accent })
  slide.addText(trunc(chapter.title || `Chapter ${pos}`, 70), {
    x: 0.35, y: 0.46, w: 12.5, h: 0.52,
    fontSize: 20, bold: true, color: C.text, fontFace: SANS,
  })
  slide.addText(trunc(chapter.task_text, 140), {
    x: 0.35, y: 1.0, w: 12.5, h: 0.3,
    fontSize: 9.5, color: C.muted, fontFace: SANS,
  })

  // ── Stats row ─────────────────────────────────────────────────
  const statItems = [
    { l: 'ATTEMPTS',     v: String(chStat.attempts ?? 0) },
    { l: 'SUCCESS RATE', v: `${chStat.success_rate_pct ?? 0}%`, accent: true },
    { l: 'AVG TIME',     v: chStat.avg_duration_sec ? `${chStat.avg_duration_sec}s` : '—' },
    { l: 'GAVE UP',      v: String(chStat.gave_up ?? 0), warn: true },
  ]
  statItems.forEach(({ l: lbl, v, accent, warn }, i) => {
    const sx = 0.3 + i * 3.27
    surfaceBox(slide, sx, 1.52, 3.0, 0.88)
    slide.addText(v, {
      x: sx + 0.15, y: 1.6, w: 2.7, h: 0.46,
      fontSize: 20, bold: true, fontFace: MONO,
      color: accent ? C.accent : warn ? C.warn : C.text,
    })
    slide.addText(lbl, {
      x: sx + 0.15, y: 2.08, w: 2.7, h: 0.24,
      fontSize: 7, color: C.muted, fontFace: MONO, charSpacing: 2,
    })
  })

  // ── Success rate bar ──────────────────────────────────────────
  const barY   = 2.58
  const barW   = 6.1
  label(slide, 'TASK SUCCESS RATE', 0.35, barY, 5)
  slide.addShape('rect', {
    x: 0.35, y: barY + 0.32, w: barW, h: 0.13,
    fill: { color: C.border }, line: { color: C.border, width: 0 },
  })
  const fillW = barW * ((chStat.success_rate_pct ?? 0) / 100)
  if (fillW > 0.01) {
    slide.addShape('rect', {
      x: 0.35, y: barY + 0.32, w: fillW, h: 0.13,
      fill: { color: C.accent }, line: { color: C.accent, width: 0 },
    })
  }
  slide.addText(`${chStat.success_rate_pct ?? 0}%`, {
    x: 0.35 + barW + 0.12, y: barY + 0.22, w: 0.8, h: 0.28,
    fontSize: 10, bold: true, color: C.accent, fontFace: MONO,
  })

  // ── Survey results — left panel (x: 0.35, y: 3.15, w: 6.3) ───
  let surveyY = 3.15

  // Helper to extract answers for a question
  const getAnswers = (q) => results.flatMap(session =>
    (session.chapter_responses || [])
      .filter(cr => cr.chapters?.position === pos)
      .flatMap(cr =>
        (cr.survey_answers || []).filter(a => a.question_id === q.id)
      )
  )

  // ── Rating questions ──────────────────────────────────────────
  const ratingQs = chapter.survey_questions.filter(q => q.kind === 'rating').slice(0, 2)
  ratingQs.forEach(q => {
    const allRatings = getAnswers(q)
      .map(a => a.rating_value)
      .filter(v => v != null)
    const avg = allRatings.length
      ? (allRatings.reduce((s, v) => s + v, 0) / allRatings.length).toFixed(1)
      : null

    slide.addText(trunc(q.prompt, 65), {
      x: 0.35, y: surveyY, w: 6.3, h: 0.26,
      fontSize: 8, color: C.muted, fontFace: MONO,
    })
    slide.addText(avg ? `${avg} / 5` : 'no data', {
      x: 0.35, y: surveyY + 0.28, w: 1.8, h: 0.38,
      fontSize: 14, bold: true, color: avg ? C.text : C.muted, fontFace: MONO,
    })
    // 5 dot indicators
    for (let n = 1; n <= 5; n++) {
      const filled = avg && n <= Math.round(parseFloat(avg))
      slide.addShape('ellipse', {
        x: 2.3 + (n - 1) * 0.3, y: surveyY + 0.33, w: 0.2, h: 0.2,
        fill: { color: filled ? C.accent : C.border },
        line: { color: filled ? C.accent : C.border, width: 0 },
      })
    }
    slide.addText(`${allRatings.length} responses`, {
      x: 3.9, y: surveyY + 0.34, w: 2.6, h: 0.2,
      fontSize: 7, color: C.muted, fontFace: MONO,
    })
    surveyY += 0.82
  })

  // ── NPS questions ─────────────────────────────────────────────
  const npsQs = chapter.survey_questions.filter(q => q.kind === 'nps').slice(0, 1)
  npsQs.forEach(q => {
    const vals = getAnswers(q).map(a => a.nps_value).filter(v => v != null)
    if (!vals.length) return

    const promoters  = vals.filter(v => v >= 9).length
    const passives   = vals.filter(v => v >= 7 && v <= 8).length
    const detractors = vals.filter(v => v <= 6).length
    const nps        = Math.round((promoters / vals.length - detractors / vals.length) * 100)

    label(slide, 'NPS', 0.35, surveyY, 6)
    slide.addText(trunc(q.prompt, 65), {
      x: 0.35, y: surveyY + 0.22, w: 6.3, h: 0.22,
      fontSize: 7.5, color: C.muted, fontFace: MONO,
    })
    surveyY += 0.5

    // Score + breakdown boxes
    const boxes = [
      { l: 'SCORE',       v: (nps > 0 ? '+' : '') + nps, color: C.accent },
      { l: 'PROMOTERS',   v: String(promoters),            color: C.success },
      { l: 'PASSIVES',    v: String(passives),             color: C.muted },
      { l: 'DETRACTORS',  v: String(detractors),           color: C.warn },
    ]
    const bw = 1.45
    boxes.forEach(({ l: bl, v, color }, bi) => {
      const bx = 0.35 + bi * (bw + 0.08)
      surfaceBox(slide, bx, surveyY, bw, 0.62)
      slide.addText(v, {
        x: bx + 0.1, y: surveyY + 0.06, w: bw - 0.2, h: 0.3,
        fontSize: 16, bold: true, color, fontFace: MONO,
      })
      slide.addText(bl, {
        x: bx + 0.1, y: surveyY + 0.38, w: bw - 0.2, h: 0.18,
        fontSize: 6, color: C.muted, fontFace: MONO, charSpacing: 1.5,
      })
    })
    surveyY += 0.78
  })

  // ── Opinion Scale questions ───────────────────────────────────
  const opinionQs = chapter.survey_questions.filter(q => q.kind === 'opinion_scale').slice(0, 2)
  opinionQs.forEach(q => {
    const vals = getAnswers(q).map(a => a.opinion_value).filter(v => v != null)
    if (!vals.length) return

    const max = q.scale_labels?.max ?? 7
    const avg = (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1)

    label(slide, 'OPINION SCALE', 0.35, surveyY, 6)
    slide.addText(trunc(q.prompt, 65), {
      x: 0.35, y: surveyY + 0.22, w: 6.3, h: 0.22,
      fontSize: 7.5, color: C.muted, fontFace: MONO,
    })
    surveyY += 0.5

    // Avg + mini distribution
    slide.addText(`${avg} / ${max}`, {
      x: 0.35, y: surveyY, w: 1.6, h: 0.34,
      fontSize: 16, bold: true, color: C.accent, fontFace: MONO,
    })
    slide.addText(`${vals.length} responses`, {
      x: 2.0, y: surveyY + 0.1, w: 2.0, h: 0.22,
      fontSize: 7, color: C.muted, fontFace: MONO,
    })
    surveyY += 0.4

    // Mini bar per scale value
    const totalBarW = 6.0
    const barH      = 0.18
    const buckets   = Array.from({ length: max }, (_, i) => i + 1)
    const maxCount  = Math.max(1, ...buckets.map(n => vals.filter(v => v === n).length))
    buckets.forEach(n => {
      const cnt  = vals.filter(v => v === n).length
      const fw   = (totalBarW / max) - 0.04
      const bx   = 0.35 + (n - 1) * (totalBarW / max)
      const fillH = barH * (cnt / maxCount)
      // background
      slide.addShape('rect', {
        x: bx, y: surveyY, w: fw, h: barH,
        fill: { color: C.border }, line: { color: C.border, width: 0 },
      })
      // fill
      if (fillH > 0.01) {
        slide.addShape('rect', {
          x: bx, y: surveyY + (barH - fillH), w: fw, h: fillH,
          fill: { color: C.accent }, line: { color: C.accent, width: 0 },
        })
      }
      slide.addText(String(n), {
        x: bx, y: surveyY + barH + 0.02, w: fw, h: 0.15,
        fontSize: 6, color: C.muted, fontFace: MONO, align: 'center',
      })
    })
    surveyY += barH + 0.22
  })

  // ── Yes / No questions ────────────────────────────────────────
  const yesnoQs = chapter.survey_questions.filter(q => q.kind === 'yes_no').slice(0, 2)
  yesnoQs.forEach(q => {
    const bools = getAnswers(q).map(a => a.bool_value).filter(v => v != null)
    if (!bools.length) return

    const yes = bools.filter(v => v === true).length
    const no  = bools.filter(v => v === false).length

    slide.addText(trunc(q.prompt, 65), {
      x: 0.35, y: surveyY, w: 6.3, h: 0.22,
      fontSize: 7.5, color: C.muted, fontFace: MONO,
    })
    surveyY += 0.28

    const bw2 = 2.95
    // Yes bar
    const yFill = bw2 * (yes / bools.length)
    slide.addShape('rect', {
      x: 0.35, y: surveyY, w: bw2, h: 0.28,
      fill: { color: C.border }, line: { color: C.border, width: 0 },
    })
    if (yFill > 0.01) slide.addShape('rect', { x: 0.35, y: surveyY, w: yFill, h: 0.28, fill: { color: C.success }, line: { color: C.success, width: 0 } })
    slide.addText(`Yes  ${Math.round(yes / bools.length * 100)}%`, {
      x: 0.48, y: surveyY + 0.05, w: 1.5, h: 0.2,
      fontSize: 8, bold: true, color: C.text, fontFace: MONO,
    })

    // No bar
    const nFill = bw2 * (no / bools.length)
    slide.addShape('rect', {
      x: 3.5, y: surveyY, w: bw2, h: 0.28,
      fill: { color: C.border }, line: { color: C.border, width: 0 },
    })
    if (nFill > 0.01) slide.addShape('rect', { x: 3.5, y: surveyY, w: nFill, h: 0.28, fill: { color: C.warn }, line: { color: C.warn, width: 0 } })
    slide.addText(`No  ${Math.round(no / bools.length * 100)}%`, {
      x: 3.63, y: surveyY + 0.05, w: 1.5, h: 0.2,
      fontSize: 8, bold: true, color: C.text, fontFace: MONO,
    })

    surveyY += 0.44
  })

  // ── Multiple Choice questions ─────────────────────────────────
  const mcQs = chapter.survey_questions.filter(q => q.kind === 'multiple_choice').slice(0, 1)
  mcQs.forEach(q => {
    const choices = getAnswers(q).map(a => a.choice_value).filter(v => v != null)
    if (!choices.length) return

    const opts = Array.isArray(q.options) ? q.options : []
    const allOpts = [...new Set([...opts, ...choices])]

    label(slide, 'MULTIPLE CHOICE', 0.35, surveyY, 6)
    slide.addText(trunc(q.prompt, 65), {
      x: 0.35, y: surveyY + 0.22, w: 6.3, h: 0.22,
      fontSize: 7.5, color: C.muted, fontFace: MONO,
    })
    surveyY += 0.5

    allOpts.slice(0, 5).forEach(opt => {
      const cnt = choices.filter(c => c === opt).length
      addDistBar(slide, 0.35, surveyY, 5.8, opt, cnt, choices.length, C.accent)
      surveyY += 0.28
    })
    surveyY += 0.08
  })

  // ── Text quotes ───────────────────────────────────────────────
  const textAnswers = results.flatMap(session =>
    (session.chapter_responses || [])
      .filter(cr => cr.chapters?.position === pos)
      .flatMap(cr =>
        (cr.survey_answers || [])
          .filter(a => a.text_value?.trim())
          .map(a => a.text_value.trim())
      )
  ).slice(0, 2)

  if (textAnswers.length > 0 && surveyY < 6.8) {
    surveyY += 0.1
    label(slide, 'PARTICIPANT QUOTES', 0.35, surveyY, 6)
    surveyY += 0.35

    textAnswers.forEach(text => {
      if (surveyY > 6.8) return
      const t = trunc(text, 100)
      surfaceBox(slide, 0.35, surveyY, 6.3, 0.48)
      slide.addText(`"${t}"`, {
        x: 0.5, y: surveyY + 0.07, w: 6.0, h: 0.36,
        fontSize: 7.5, color: C.text, fontFace: SANS, italic: true, wrap: true,
      })
      surveyY += 0.58
    })
  }

  // ── Trigger Funnel — right panel ──────────────────────────────
  const rpX = 7.0
  const rpY = 1.52
  const rpW = 6.05
  const rpH = 5.75

  surfaceBox(slide, rpX, rpY, rpW, rpH)
  label(slide, 'TRIGGER FUNNEL', rpX + 0.25, rpY + 0.22, rpW - 0.5, { color: C.accent })

  const defs = triggerDefs || []

  if (defs.length === 0) {
    slide.addText('No triggers configured for this task', {
      x: rpX + 0.3, y: rpY + 0.7, w: rpW - 0.6, h: 0.4,
      fontSize: 9, color: C.muted, fontFace: MONO, italic: true,
    })
  } else {
    // Count total sessions for this chapter
    const chSessions = results.flatMap(s =>
      (s.chapter_responses || []).filter(cr => cr.chapters?.position === pos)
    )
    const totalCh = chSessions.length || 1

    const eventsMap = new Map()
    ;(triggerEvents || []).forEach(ev => {
      const key = ev.trigger_definition_id
      eventsMap.set(key, (eventsMap.get(key) || 0) + 1)
    })

    const rowH = Math.min(0.72, (rpH - 0.9) / defs.length)
    defs.forEach((def, di) => {
      const ry   = rpY + 0.68 + di * rowH
      const cnt  = eventsMap.get(def.id) || 0
      const pct  = Math.round((cnt / totalCh) * 100)
      const fw   = Math.max(0.02, (rpW - 1.6) * (cnt / totalCh))

      // Row label
      slide.addText(trunc(def.name, 28), {
        x: rpX + 0.25, y: ry, w: rpW - 0.5, h: 0.22,
        fontSize: 8, color: C.text, fontFace: MONO,
      })
      // Track
      slide.addShape('rect', {
        x: rpX + 0.25, y: ry + 0.26, w: rpW - 1.4, h: 0.16,
        fill: { color: C.border }, line: { color: C.border, width: 0 },
      })
      // Fill — gradient from accent to slightly dim
      slide.addShape('rect', {
        x: rpX + 0.25, y: ry + 0.26, w: fw, h: 0.16,
        fill: { color: C.accent }, line: { color: C.accent, width: 0 },
      })
      // Count + pct label
      slide.addText(`${cnt}  (${pct}%)`, {
        x: rpX + rpW - 1.1, y: ry + 0.22, w: 0.9, h: 0.22,
        fontSize: 7.5, color: C.accent, fontFace: MONO, align: 'right',
      })
    })
  }

  // Frame name label at bottom of right panel
  label(slide, 'FRAME TRIGGER EVENTS  ·  PER SESSION', rpX + 0.25, rpY + rpH - 0.28, rpW - 0.5)
}

// ── Main export function ──────────────────────────────────────────────────────

/**
 * Generate and download a PPTX results deck.
 *
 * @param {object} study   — from getStudyWithChapters (includes chapters + survey_questions + trigger_definitions)
 * @param {Array}  results — from getStudyResults (sessions with nested chapter_responses + trigger_events)
 * @param {Array}  stats   — from getChapterStats (chapter_stats view)
 */
export async function exportStudyPptx(study, results, stats) {
  const { default: pptxgen } = await import('pptxgenjs')
  const prs    = new pptxgen()
  prs.layout   = 'LAYOUT_WIDE'
  prs.title    = study.title
  prs.author   = 'User Testing Tool'
  prs.subject  = 'Usability Study Results'

  addTitleSlide(prs, study, results)
  addOverviewSlide(prs, study, stats)

  for (const chapter of study.chapters) {
    const chStat = stats.find(s => s.position === chapter.position) || {}

    // Collect trigger definitions for this chapter
    const triggerDefs = chapter.trigger_definitions || []

    // Collect trigger events for sessions in this chapter
    const triggerEvents = results.flatMap(session =>
      (session.chapter_responses || [])
        .filter(cr => cr.chapters?.position === chapter.position)
        .flatMap(cr => cr.trigger_events || [])
    )

    addChapterSlide(prs, chapter, chStat, results, triggerDefs, triggerEvents)
  }

  const safeTitle = study.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()
  await prs.writeFile({ fileName: `${safeTitle}_results.pptx` })
}

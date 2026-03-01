import { supabase } from './supabase'

// ── Studies ──────────────────────────────────────────────────────────────────

/** Fetch study for editing — no is_active filter, includes all chapters regardless of status */
export async function getStudyForEdit(studyId) {
  const { data: study, error: sErr } = await supabase
    .from('studies')
    .select('*')
    .eq('id', studyId)
    .single()

  if (sErr) throw sErr

  const { data: chapters, error: cErr } = await supabase
    .from('chapters')
    .select('*, survey_questions(*), trigger_definitions(*)')
    .eq('study_id', studyId)
    .order('position')

  if (cErr) throw cErr

  chapters.forEach(ch => {
    ch.survey_questions.sort((a, b) => a.position - b.position)
    ch.trigger_definitions = (ch.trigger_definitions || []).sort((a, b) => a.position - b.position)
  })

  const { data: screenerQuestions, error: sqErr } = await supabase
    .from('screener_questions')
    .select('*')
    .eq('study_id', studyId)
    .order('position')

  if (sqErr) throw sqErr

  return { ...study, chapters, screener_questions: screenerQuestions || [] }
}

/** Fetch a study + its chapters + each chapter's survey questions + trigger definitions + screener questions */
export async function getStudyWithChapters(studyId) {
  const { data: study, error: sErr } = await supabase
    .from('studies')
    .select('*')
    .eq('id', studyId)
    .eq('is_active', true)
    .single()

  if (sErr) throw sErr

  const { data: chapters, error: cErr } = await supabase
    .from('chapters')
    .select('*, survey_questions(*), trigger_definitions(*)')
    .eq('study_id', studyId)
    .order('position')

  if (cErr) throw cErr

  // Sort questions and triggers within each chapter
  chapters.forEach(ch => {
    ch.survey_questions.sort((a, b) => a.position - b.position)
    ch.trigger_definitions = (ch.trigger_definitions || []).sort((a, b) => a.position - b.position)
  })

  const { data: screenerQuestions, error: sqErr } = await supabase
    .from('screener_questions')
    .select('*')
    .eq('study_id', studyId)
    .order('position')

  if (sqErr) throw sqErr

  return { ...study, chapters, screener_questions: screenerQuestions || [] }
}

// ── Sessions ─────────────────────────────────────────────────────────────────

/** Create a new session when participant lands on the study */
export async function createSession(studyId, participantRef = null) {
  const { data, error } = await supabase
    .from('sessions')
    .insert({ study_id: studyId, participant_ref: participantRef })
    .select()
    .single()

  if (error) throw error
  return data
}

/** Mark session as completed */
export async function completeSession(sessionId) {
  const { error } = await supabase
    .from('sessions')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', sessionId)

  if (error) throw error
}

/** Save screener answers for a session */
export async function saveScreenerAnswers(sessionId, answers) {
  const { error } = await supabase
    .from('sessions')
    .update({ screener_answers: answers })
    .eq('id', sessionId)

  if (error) throw error
}

/** Count sessions for a study */
export async function getSessionCount(studyId) {
  const { count, error } = await supabase
    .from('sessions')
    .select('*', { count: 'exact', head: true })
    .eq('study_id', studyId)

  if (error) throw error
  return count ?? 0
}

// ── Chapter responses ────────────────────────────────────────────────────────

/** Called when participant presses "Start Task" — opens the chapter response */
export async function startChapterResponse(sessionId, chapterId) {
  const { data, error } = await supabase
    .from('chapter_responses')
    .insert({ session_id: sessionId, chapter_id: chapterId })
    .select()
    .single()

  if (error) throw error
  return data
}

/** Called when participant presses Done or Can't complete this */
export async function finishChapterResponse(chapterResponseId, outcome, durationMs) {
  const { error } = await supabase
    .from('chapter_responses')
    .update({
      completed_at: new Date().toISOString(),
      outcome,
      duration_ms: durationMs,
    })
    .eq('id', chapterResponseId)

  if (error) throw error
}

// ── Survey answers ────────────────────────────────────────────────────────────

/**
 * answers = [{ question_id, rating_value?, text_value?, opinion_value?,
 *              nps_value?, choice_value?, bool_value? }, ...]
 */
export async function saveSurveyAnswers(chapterResponseId, answers) {
  if (!answers.length) return

  const rows = answers.map(a => ({
    chapter_response_id: chapterResponseId,
    question_id:   a.question_id,
    rating_value:  a.rating_value  ?? null,
    text_value:    a.text_value    ?? null,
    opinion_value: a.opinion_value ?? null,
    nps_value:     a.nps_value     ?? null,
    choice_value:  a.choice_value  ?? null,
    bool_value:    a.bool_value    ?? null,
  }))

  const { error } = await supabase.from('survey_answers').insert(rows)
  if (error) throw error
}

// ── Trigger Definitions ───────────────────────────────────────────────────────

/** Replace all trigger definitions for a chapter (delete + insert) */
export async function saveTriggerDefinitions(chapterId, triggers) {
  // Delete existing
  const { error: delErr } = await supabase
    .from('trigger_definitions')
    .delete()
    .eq('chapter_id', chapterId)
  if (delErr) throw delErr

  if (!triggers || !triggers.length) return

  const rows = triggers.map((t, i) => ({
    chapter_id: chapterId,
    position:   i + 1,
    name:       t.name.trim(),
    frame_name: t.frame_name.trim(),
    action:     t.action || 'none',
  }))

  const { error } = await supabase.from('trigger_definitions').insert(rows)
  if (error) throw error
}

/** Get trigger definitions for a chapter (ordered by position) */
export async function getTriggerDefinitions(chapterId) {
  const { data, error } = await supabase
    .from('trigger_definitions')
    .select('*')
    .eq('chapter_id', chapterId)
    .order('position')

  if (error) throw error
  return data || []
}

/** Record that a trigger fired during a chapter response (fire-and-forget safe) */
export async function saveTriggerEvent(chapterResponseId, triggerDefinitionId) {
  const { error } = await supabase
    .from('trigger_events')
    .insert({ chapter_response_id: chapterResponseId, trigger_definition_id: triggerDefinitionId })
  if (error) throw error
}

/** Aggregate trigger event counts for all chapters in a study */
export async function getTriggerResults(studyId) {
  // Fetch all trigger definitions for the study's chapters
  const { data: chapters, error: cErr } = await supabase
    .from('chapters')
    .select('id, position')
    .eq('study_id', studyId)
  if (cErr) throw cErr

  const chapterIds = chapters.map(c => c.id)
  if (!chapterIds.length) return []

  const { data: defs, error: dErr } = await supabase
    .from('trigger_definitions')
    .select('id, chapter_id, name, frame_name, position, action')
    .in('chapter_id', chapterIds)
    .order('position')
  if (dErr) throw dErr

  if (!defs.length) return []

  const { data: events, error: eErr } = await supabase
    .from('trigger_events')
    .select('trigger_definition_id, chapter_response_id')
    .in('trigger_definition_id', defs.map(d => d.id))
  if (eErr) throw eErr

  // Build result: per trigger, count unique chapter_response_ids that fired it
  const chPosMap = new Map(chapters.map(c => [c.id, c.position]))

  return defs.map(def => {
    const matched = events.filter(e => e.trigger_definition_id === def.id)
    return {
      trigger_definition_id: def.id,
      chapter_id:   def.chapter_id,
      chapter_pos:  chPosMap.get(def.chapter_id),
      name:         def.name,
      frame_name:   def.frame_name,
      position:     def.position,
      count:        matched.length,
    }
  })
}

// ── Voice Recordings ──────────────────────────────────────────────────────────

/** Save metadata for an uploaded voice recording */
export async function saveVoiceRecording(chapterResponseId, storagePath, durationMs) {
  const { error } = await supabase
    .from('voice_recordings')
    .insert({
      chapter_response_id: chapterResponseId,
      storage_path:        storagePath,
      duration_ms:         durationMs ?? null,
    })
  if (error) throw error
}

/** Get a 1-hour signed URL for playback */
export async function getVoiceRecordingUrl(storagePath) {
  const { data, error } = await supabase.storage
    .from('voice-recordings')
    .createSignedUrl(storagePath, 3600)
  if (error) throw error
  return data.signedUrl
}

// ── Admin — results ───────────────────────────────────────────────────────────

/** All sessions for a study with chapter response details (includes trigger events + voice recordings) */
export async function getStudyResults(studyId) {
  const { data, error } = await supabase
    .from('sessions')
    .select(`
      *,
      chapter_responses (
        *,
        chapters ( title, position ),
        survey_answers ( *, survey_questions ( prompt, kind ) ),
        trigger_events ( id, trigger_definition_id, fired_at ),
        voice_recordings ( id, storage_path, duration_ms, created_at )
      )
    `)
    .eq('study_id', studyId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/** Study-level summary stats (uses the DB view) */
export async function getStudySummary(studyId) {
  const { data, error } = await supabase
    .from('study_summary')
    .select('*')
    .eq('id', studyId)
    .single()

  if (error) throw error
  return data
}

/** Per-chapter stats (uses the DB view) */
export async function getChapterStats(studyId) {
  const { data, error } = await supabase
    .from('chapter_stats')
    .select('*')
    .eq('study_id', studyId)
    .order('position')

  if (error) throw error
  return data
}

// ── Admin — study management ──────────────────────────────────────────────────

export async function renameStudy(studyId, title) {
  const { error } = await supabase
    .from('studies')
    .update({ title })
    .eq('id', studyId)
  if (error) throw error
}

export async function closeStudy(studyId) {
  const { error } = await supabase
    .from('studies')
    .update({ is_active: false })
    .eq('id', studyId)
  if (error) throw error
}

export async function archiveStudy(studyId) {
  const { error } = await supabase
    .from('studies')
    .update({ is_archived: true })
    .eq('id', studyId)
  if (error) throw error
}

export async function unarchiveStudy(studyId) {
  const { error } = await supabase
    .from('studies')
    .update({ is_archived: false })
    .eq('id', studyId)
  if (error) throw error
}

export async function resetStudyData(studyId) {
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('study_id', studyId)
  if (error) throw error
}

export async function deleteStudy(studyId) {
  const { error } = await supabase
    .from('studies')
    .delete()
    .eq('id', studyId)
  if (error) throw error
}

export async function updateStudySettings(studyId, patch) {
  const { error } = await supabase
    .from('studies')
    .update(patch)
    .eq('id', studyId)
  if (error) throw error
}

export async function duplicateStudy(studyId) {
  // 1. Fetch original
  const { data: orig, error: sErr } = await supabase
    .from('studies')
    .select('*')
    .eq('id', studyId)
    .single()
  if (sErr) throw sErr

  const { data: origChapters, error: cErr } = await supabase
    .from('chapters')
    .select('*, survey_questions(*), trigger_definitions(*)')
    .eq('study_id', studyId)
    .order('position')
  if (cErr) throw cErr

  const { data: origScreener, error: sqErr } = await supabase
    .from('screener_questions')
    .select('*')
    .eq('study_id', studyId)
    .order('position')
  if (sqErr) throw sqErr

  // 2. Insert new study
  const { data: newStudy, error: nsErr } = await supabase
    .from('studies')
    .insert({
      title:                  orig.title + ' (copy)',
      description:            orig.description,
      thank_you_msg:          orig.thank_you_msg,
      redirect_url:           orig.redirect_url,
      chapter_count:          orig.chapter_count,
      enable_voice_recording: orig.enable_voice_recording,
    })
    .select()
    .single()
  if (nsErr) throw nsErr

  // 3. Insert chapters + their survey questions + trigger definitions
  for (const ch of origChapters) {
    const { data: newCh, error: nchErr } = await supabase
      .from('chapters')
      .insert({
        study_id:        newStudy.id,
        position:        ch.position,
        title:           ch.title,
        task_text:       ch.task_text,
        figma_url:       ch.figma_url,
        transition_desc: ch.transition_desc,
        is_figma_make:   ch.is_figma_make,
      })
      .select()
      .single()
    if (nchErr) throw nchErr

    const questions = (ch.survey_questions || []).map(q => ({
      chapter_id:   newCh.id,
      position:     q.position,
      kind:         q.kind,
      prompt:       q.prompt,
      options:      q.options,
      scale_labels: q.scale_labels,
    }))
    if (questions.length) {
      const { error: qErr } = await supabase.from('survey_questions').insert(questions)
      if (qErr) throw qErr
    }

    const triggers = (ch.trigger_definitions || []).map(t => ({
      chapter_id: newCh.id,
      position:   t.position,
      name:       t.name,
      frame_name: t.frame_name,
      action:     t.action || 'none',
    }))
    if (triggers.length) {
      const { error: tErr } = await supabase.from('trigger_definitions').insert(triggers)
      if (tErr) throw tErr
    }
  }

  // 4. Insert screener questions
  if (origScreener.length) {
    const screenerRows = origScreener.map(q => ({
      study_id:    newStudy.id,
      position:    q.position,
      prompt:      q.prompt,
      kind:        q.kind,
      options:     q.options,
      is_required: q.is_required,
    }))
    const { error: sqInsErr } = await supabase.from('screener_questions').insert(screenerRows)
    if (sqInsErr) throw sqInsErr
  }

  return newStudy.id
}

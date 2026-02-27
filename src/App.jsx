import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useEffect } from 'react'

function AdminLayout() {
  useEffect(() => {
    const saved = localStorage.getItem('admin_theme') || 'light'
    if (saved === 'dark') document.documentElement.dataset.theme = 'dark'
    return () => { delete document.documentElement.dataset.theme }
  }, [])
  return <Outlet />
}

// Participant flow
import Welcome           from './pages/participant/Welcome'
import Screener          from './pages/participant/Screener'
import TaskBrief         from './pages/participant/TaskBrief'
import Prototype         from './pages/participant/Prototype'
import Survey            from './pages/participant/Survey'
import ChapterTransition from './pages/participant/ChapterTransition'
import ThankYou          from './pages/participant/ThankYou'

// Admin
import AdminLogin     from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import StudyResults   from './pages/admin/StudyResults'
import StudyBuilder   from './pages/admin/StudyBuilder'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Participant routes ── */}
        <Route path="/s/:studyId"                          element={<Welcome />} />
        <Route path="/s/:studyId/screener"                 element={<Screener />} />
        <Route path="/s/:studyId/ch/:chapterPos/task"      element={<TaskBrief />} />
        <Route path="/s/:studyId/ch/:chapterPos/prototype" element={<Prototype />} />
        <Route path="/s/:studyId/ch/:chapterPos/survey"    element={<Survey />} />
        <Route path="/s/:studyId/ch/:chapterPos"           element={<ChapterTransition />} />
        <Route path="/s/:studyId/done"                     element={<ThankYou />} />

        {/* ── Admin routes (light theme) ── */}
        <Route element={<AdminLayout />}>
          <Route path="/admin"                             element={<AdminLogin />} />
          <Route path="/admin/dashboard"                   element={<AdminDashboard />} />
          <Route path="/admin/studies/new"                 element={<StudyBuilder />} />
          <Route path="/admin/studies/:studyId/edit"       element={<StudyBuilder />} />
          <Route path="/admin/studies/:studyId"            element={<StudyResults />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

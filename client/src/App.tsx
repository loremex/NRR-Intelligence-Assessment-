import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AssessmentStateProvider } from './lib/state'
import { track, initAnalytics } from './lib/analytics'
import Landing from './pages/Landing'
import Calculator from './pages/Calculator'
import DiagnosticQuestions from './pages/DiagnosticQuestions'
import DiagnosticVerdict from './pages/DiagnosticVerdict'
import Selection from './pages/Selection'
import Assessment from './pages/Assessment'
import Scorecard from './pages/Scorecard'

const ROUTE_NAMES: Record<string, string> = {
  '/': 'landing',
  '/calculator': 'calculator',
  '/diagnostic': 'diagnostic_questions',
  '/diagnostic-result': 'diagnostic_verdict',
  '/selection': 'selection',
  '/assessment': 'assessment',
  '/scorecard': 'scorecard',
}

function PageViewTracker() {
  const { pathname } = useLocation()
  useEffect(() => {
    const section_name = ROUTE_NAMES[pathname] ?? (pathname.replace(/^\//, '') || 'unknown')
    track({ name: 'page_view', props: { section_name } })
  }, [pathname])
  return null
}

function App() {
  useEffect(() => {
    initAnalytics()
  }, [])

  return (
    <AssessmentStateProvider>
      <BrowserRouter>
        <PageViewTracker />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/calculator" element={<Calculator />} />
          <Route path="/diagnostic" element={<DiagnosticQuestions />} />
          <Route path="/diagnostic-result" element={<DiagnosticVerdict />} />
          <Route path="/selection" element={<Selection />} />
          <Route path="/assessment" element={<Assessment />} />
          <Route path="/scorecard" element={<Scorecard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AssessmentStateProvider>
  )
}

export default App

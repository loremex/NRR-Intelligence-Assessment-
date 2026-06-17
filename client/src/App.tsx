import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { SessionProvider } from './lib/session'
import { track } from './lib/analytics'
import Landing from './pages/Landing'
import Calculator from './pages/Calculator'

const ROUTE_NAMES: Record<string, string> = {
  '/': 'landing',
  '/calculator': 'calculator',
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
  return (
    <SessionProvider>
      <BrowserRouter>
        <PageViewTracker />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/calculator" element={<Calculator />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  )
}

export default App

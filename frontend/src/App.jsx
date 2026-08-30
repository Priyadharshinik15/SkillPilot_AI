import React from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { LearnerProvider, useLearner } from './store/LearnerContext'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import LandingPage from './pages/LandingPage'

import CommandCenter from './pages/CommandCenter'
import MyTwin       from './pages/MyTwin'
import SkillMap     from './pages/SkillMap'
import Roadmap      from './pages/Roadmap'
import NextAction   from './pages/NextAction'
import ProjectLab   from './pages/ProjectLab'
import Assessments  from './pages/Assessments'
import Adaptations  from './pages/Adaptations'
import WhatIf       from './pages/WhatIf'
import AICopilot    from './pages/AICopilot'
import Settings     from './pages/Settings'

function Layout() {
  const { learner, isAuthenticated, loading } = useLearner()
  const location = useLocation()
  const isCopilot = location.pathname === '/copilot'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-900 text-white flex-col gap-4">
        <div className="w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-sm font-bold tracking-widest text-brand-400 uppercase animate-pulse">Initializing SkillPilot Nav...</div>
      </div>
    )
  }

  if (!isAuthenticated || !learner) {
    return <LandingPage />
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar pathname={location.pathname} />
        <main className={`flex-1 ${isCopilot ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'}`}>
          <Routes>
            <Route path="/"            element={<CommandCenter />} />
            <Route path="/twin"        element={<MyTwin />}        />
            <Route path="/skillmap"    element={<SkillMap />}      />
            <Route path="/roadmap"     element={<Roadmap />}       />
            <Route path="/next-action" element={<NextAction />}    />
            <Route path="/projects"    element={<ProjectLab />}    />
            <Route path="/assess"      element={<Assessments />}   />
            <Route path="/adaptations" element={<Adaptations />}   />
            <Route path="/whatif"      element={<WhatIf />}        />
            <Route path="/copilot"     element={<AICopilot />}     />
            <Route path="/settings"    element={<Settings />}      />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <LearnerProvider>
      <Layout />
    </LearnerProvider>
  )
}

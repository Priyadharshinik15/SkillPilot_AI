import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Dna, Network, Map, Zap,
  FlaskConical, ClipboardList, RefreshCw, Sparkles,
  MessageSquare, Settings, ChevronRight, LogOut
} from 'lucide-react'
import { useLearner } from '../store/LearnerContext'

const NAV = [
  { path: '/',            icon: LayoutDashboard, label: 'Command Center' },
  { path: '/twin',        icon: Dna,             label: 'My Twin'        },
  { path: '/skillmap',    icon: Network,         label: 'Skill Map'      },
  { path: '/roadmap',     icon: Map,             label: 'Learning Path'  },
  { path: '/next-action', icon: Zap,             label: 'Next Action'    },
  { path: '/projects',    icon: FlaskConical,    label: 'Project Lab'    },
  { path: '/assess',      icon: ClipboardList,   label: 'Assessments'    },
  { path: '/adaptations', icon: RefreshCw,       label: 'Adaptations'    },
  { path: '/whatif',      icon: Sparkles,        label: 'What-If'        },
  { path: '/copilot',     icon: MessageSquare,   label: 'AI Copilot'     },
]

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { learner, logout } = useLearner()

  return (
    <aside className="w-60 flex-shrink-0 h-screen flex flex-col bg-surface-800 border-r border-white/5">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shadow-glow">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white tracking-wide">SkillPilot</div>
            <div className="text-[10px] text-brand-400 font-mono uppercase tracking-widest">AI Navigator</div>
          </div>
        </div>
      </div>

      {/* User */}
      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-white/3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-accent-purple flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {learner.name[0]}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white truncate">{learner.name}</div>
            <div className="text-[10px] text-slate-500 truncate">{learner.goal}</div>
          </div>
        </div>
      </div>

      {/* Readiness strip */}
      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest">Career Readiness</span>
          <span className="text-xs font-bold text-accent-green">{learner.readiness}%</span>
        </div>
        <div className="h-1.5 bg-surface-600 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-600 to-accent-green rounded-full skill-bar-fill"
            style={{ width: `${learner.readiness}%` }}
          />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`nav-item w-full ${active ? 'active' : ''}`}
            >
              <Icon size={16} className={active ? 'text-brand-400' : ''} />
              <span>{label}</span>
              {active && <ChevronRight size={12} className="ml-auto text-brand-400" />}
            </button>
          )
        })}
      </nav>

      {/* Settings & Logout */}
      <div className="px-3 py-3 border-t border-white/5 space-y-1">
        <button 
          onClick={() => navigate('/settings')}
          className={`nav-item w-full ${location.pathname === '/settings' ? 'active' : ''}`}
        >
          <Settings size={16} className={location.pathname === '/settings' ? 'text-brand-400' : ''} />
          <span>Settings</span>
        </button>
        <button 
          onClick={logout}
          className="nav-item w-full hover:text-accent-red hover:bg-accent-red/5 text-slate-400"
        >
          <LogOut size={16} />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  )
}

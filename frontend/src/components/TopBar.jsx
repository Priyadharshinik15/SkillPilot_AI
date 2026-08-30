import React, { useState, useRef, useEffect } from 'react'
import { Bell, Search, AlertTriangle, GitFork, CheckCircle2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLearner } from '../store/LearnerContext'
import axios from 'axios'

const PAGE_TITLES = {
  '/':            { title: 'Command Center',  sub: 'What should you do right now?' },
  '/twin':        { title: 'My Learner Twin', sub: 'Your living knowledge profile'  },
  '/skillmap':    { title: 'Skill Map',        sub: 'Interactive knowledge graph'    },
  '/roadmap':     { title: 'Learning Path',    sub: 'Your milestone roadmap'         },
  '/next-action': { title: 'Next Best Action', sub: 'AI-selected intervention'       },
  '/projects':    { title: 'Project Lab',      sub: 'Skill-targeted projects'        },
  '/assess':      { title: 'Assessments',      sub: 'Test & update your mastery'     },
  '/adaptations': { title: 'Path Adaptations', sub: 'How AI changed your roadmap'    },
  '/whatif':      { title: 'What-If Simulator',sub: 'Explore constraint scenarios'   },
  '/copilot':     { title: 'AI Copilot',       sub: 'Context-aware learning chat'    },
  '/settings':    { title: 'Settings',         sub: 'Manage career goals and database' },
}

export default function TopBar({ pathname }) {
  const { learner } = useLearner()
  const navigate = useNavigate()
  const [showNotifications, setShowNotifications] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState({ skills: [], careers: [], courses: [], projects: [] })
  const [isSearching, setIsSearching] = useState(false)
  const dropdownRef = useRef(null)

  const page = PAGE_TITLES[pathname] || PAGE_TITLES['/']

  // Debounced search query execution
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ skills: [], careers: [], courses: [], projects: [] })
      return
    }
    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true)
      try {
        const resp = await axios.get(`/api/search?q=${encodeURIComponent(searchQuery)}`)
        setSearchResults(resp.data)
      } catch (err) {
        console.error("Search failed:", err)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery])

  // Handle clicking outside to close the dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const decayAlerts = learner.decayAlerts || []
  const adaptations = learner.adaptationHistory || []
  
  const hasNotifications = decayAlerts.length > 0 || adaptations.length > 0
  const totalCount = decayAlerts.length + (adaptations.length > 0 ? 1 : 0)

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-white/5 bg-surface-800/50 backdrop-blur-sm flex-shrink-0 relative z-40">
      <div>
        <h1 className="text-sm font-semibold text-white">{page.title}</h1>
        <p className="text-xs text-slate-500">{page.sub}</p>
      </div>

      <div className="flex items-center gap-3">
        <button 
          onClick={() => setIsSearchOpen(true)}
          className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
        >
          <Search size={16} />
        </button>

        {/* Interactive Notification Bell */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`relative p-2 rounded-lg hover:bg-white/5 transition-colors ${
              showNotifications ? 'bg-white/5 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bell size={16} />
            {hasNotifications && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-red rounded-full glow-dot" />
            )}
          </button>

          {/* Notifications Dropdown menu */}
          {showNotifications && (
            <div className="absolute top-10 right-0 w-80 glass-card p-4 shadow-2xl z-50 border border-white/10 bg-surface-800/95 backdrop-blur-md rounded-xl text-left space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Alerts & Engine Notifications</span>
                {hasNotifications && (
                  <span className="bg-accent-red/20 text-accent-red px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">
                    {totalCount} Active
                  </span>
                )}
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2.5">
                {decayAlerts.length > 0 && decayAlerts.map((alert, i) => (
                  <div 
                    key={`decay-${i}`} 
                    onClick={() => {
                      setShowNotifications(false)
                      navigate('/assess')
                    }}
                    className="p-2.5 rounded-lg bg-accent-yellow/5 border border-accent-yellow/10 hover:border-accent-yellow/30 transition-all cursor-pointer flex gap-2.5 items-start"
                  >
                    <AlertTriangle size={14} className="text-accent-yellow shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[11px] font-bold text-white">Memory Decay Alert: {alert.skill}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Retention dropped to <span className="text-accent-yellow font-bold">{alert.retention}%</span>. Targeted practice suggested.
                      </div>
                    </div>
                  </div>
                ))}

                {adaptations.length > 0 && (
                  <div 
                    onClick={() => {
                      setShowNotifications(false)
                      navigate('/adaptations')
                    }}
                    className="p-2.5 rounded-lg bg-brand-500/5 border border-brand-500/10 hover:border-brand-500/30 transition-all cursor-pointer flex gap-2.5 items-start"
                  >
                    <GitFork size={14} className="text-brand-400 shrink-0 mt-0.5 rotate-90" />
                    <div>
                      <div className="text-[11px] font-bold text-white">Path Adaptations Recalculated</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Roadmap routing adjusted: <span className="text-brand-400 font-semibold">{adaptations[0].trigger}</span>.
                      </div>
                    </div>
                  </div>
                )}

                {!hasNotifications && (
                  <div className="py-6 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                    <CheckCircle2 size={20} className="text-accent-green" />
                    <span className="text-xs">All caught up! No active path warnings.</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div 
          onClick={() => navigate('/settings')}
          className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-accent-purple flex items-center justify-center text-xs font-bold text-white cursor-pointer hover:opacity-85 transition-opacity"
        >
          {learner.name[0]}
        </div>
      </div>

      {/* Search Modal Overlay */}
      {isSearchOpen && (
        <div className="fixed inset-0 bg-surface-900/80 backdrop-blur-md flex items-start justify-center pt-20 z-50 animate-fade-in">
          <div className="w-full max-w-2xl bg-surface-800/90 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2 text-white">
                <Search size={18} className="text-brand-400" />
                <span className="text-sm font-bold uppercase tracking-wider">Universal Search</span>
              </div>
              <button 
                onClick={() => {
                  setIsSearchOpen(false);
                  setSearchQuery('');
                }}
                className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search skills, careers, courses, projects..."
                className="w-full bg-surface-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
              {isSearching && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto space-y-4 pr-1">
              {searchQuery && !isSearching && 
               !searchResults.skills.length && !searchResults.careers.length && 
               !searchResults.courses.length && !searchResults.projects.length && (
                <div className="text-center py-8 text-xs text-slate-500">
                  No matching resources or skills found for "{searchQuery}".
                </div>
              )}

              {/* Matching Careers */}
              {searchResults.careers.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Careers & Paths</div>
                  <div className="grid grid-cols-2 gap-2">
                    {searchResults.careers.map(c => (
                      <button
                        key={c}
                        onClick={() => {
                          setIsSearchOpen(false);
                          setSearchQuery('');
                          navigate('/settings');
                        }}
                        className="flex items-center justify-between p-3 bg-surface-700/40 rounded-xl hover:bg-surface-700/70 transition-all border border-white/5 text-left text-xs font-semibold text-white group"
                      >
                        <span>{c}</span>
                        <span className="text-[10px] text-brand-400 group-hover:underline">Setup goal →</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Matching Skills */}
              {searchResults.skills.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Skills</div>
                  <div className="flex flex-wrap gap-2">
                    {searchResults.skills.map(s => (
                      <button
                        key={s.name}
                        onClick={() => {
                          setIsSearchOpen(false);
                          setSearchQuery('');
                          navigate('/skillmap');
                        }}
                        className="px-3 py-2 bg-brand-500/10 border border-brand-500/20 text-brand-400 rounded-xl hover:bg-brand-500/20 transition-all text-xs font-medium"
                      >
                        {s.name} <span className="text-[9px] text-slate-500 font-normal">({s.category})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Matching Courses */}
              {searchResults.courses.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Courses & Learning Resources</div>
                  <div className="space-y-2">
                    {searchResults.courses.map(course => (
                      <a
                        key={course.id}
                        href={course.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block p-3 bg-surface-700/40 hover:bg-surface-700/70 rounded-xl transition-all border border-white/5"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-xs font-bold text-white leading-tight">{course.title}</div>
                            <div className="text-[10px] text-slate-400 mt-1">Skill: {course.skill}</div>
                          </div>
                          <span className="badge text-[9px] font-bold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                            {course.difficulty}
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Matching Projects */}
              {searchResults.projects.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Projects</div>
                  <div className="space-y-2">
                    {searchResults.projects.map(proj => (
                      <div
                        key={proj.id}
                        onClick={() => {
                          setIsSearchOpen(false);
                          setSearchQuery('');
                          navigate('/projects');
                        }}
                        className="p-3 bg-accent-purple/5 hover:bg-accent-purple/10 rounded-xl transition-all border border-accent-purple/10 cursor-pointer"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-xs font-bold text-white leading-tight">{proj.title}</div>
                            <div className="text-[10px] text-slate-400 mt-1">Skill: {proj.skill}</div>
                          </div>
                          <span className="badge text-[9px] font-bold text-accent-purple bg-accent-purple/10 px-2 py-0.5 rounded border border-accent-purple/20">
                            {proj.difficulty}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

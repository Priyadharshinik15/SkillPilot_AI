import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Zap, TrendingUp, BookOpen, Code2, Trophy,
  ArrowRight, AlertTriangle, Clock, Target, Flame, ChevronDown
} from 'lucide-react'
import { useLearner } from '../store/LearnerContext'
import SkillBar from '../components/SkillBar'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function CommandCenter() {
  const { learner, goalInput, setGoalInput, isAnalyzing, analyzeGoal } = useLearner()
  const navigate = useNavigate()

  const topSkills = [...(learner?.skills || [])]
    .sort((a, b) => (b.required - b.mastery) - (a.required - a.mastery))
    .slice(0, 5)

  const handleAnalyzeGoal = () => {
    if (!goalInput.trim()) return
    analyzeGoal(goalInput)
  }

  const scrollToDashboard = () => {
    document.getElementById('dashboard-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="fade-up">

      {/* ── PAGE 1: Hero + Goal Navigator ──────────────────────────────── */}
      <div
        className="flex flex-col justify-between px-6 pt-8 pb-6"
        style={{ minHeight: 'calc(100vh - 56px)' }}
      >
        {/* Top: greeting */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium">{getGreeting()},</p>
            <h2 className="text-4xl font-black text-white mt-0.5 tracking-tight">
              {learner?.name} 👋
            </h2>
            <div className="flex items-center gap-2 mt-2">
              <Target size={14} className="text-brand-400" />
              <span className="text-sm text-slate-400">Target: </span>
              <span className="text-sm text-brand-400 font-semibold">{learner?.goal}</span>
            </div>
          </div>
          <div className="glass-card px-4 py-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent-green glow-dot" />
            <span className="text-xs text-slate-400 font-mono">AI Active</span>
          </div>
        </div>

        {/* Middle: Goal Navigator — centered vertically */}
        <div className="flex-1 flex items-center justify-center py-8">
          <div className="w-full max-w-3xl glass-card p-6 border-brand-500/20 bg-gradient-to-br from-brand-600/8 via-transparent to-transparent">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center">
                <Target size={14} className="text-brand-400" />
              </div>
              <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                🎯 AI Career Path &amp; Goal Navigator
              </p>
            </div>

            <div className="flex flex-col md:flex-row gap-3 items-end">
              <textarea
                value={goalInput}
                onChange={e => setGoalInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAnalyzeGoal() } }}
                placeholder="Describe your career goals and experience (e.g. 'I want to become an AI Engineer. I know Python well and have basic machine learning.')"
                rows={2}
                className="flex-1 w-full bg-surface-700/60 border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 transition-colors resize-none"
              />
              <button
                onClick={handleAnalyzeGoal}
                disabled={isAnalyzing || !goalInput.trim()}
                className="btn-primary w-full md:w-auto h-[52px] flex items-center justify-center gap-2 px-6 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isAnalyzing
                  ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Analyzing…</>
                  : <>Recalculate Roadmap <ArrowRight size={14} /></>
                }
              </button>
            </div>

            {/* Quick stat pills */}
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/5">
              {[
                { label: 'Readiness',    value: `${learner?.readiness ?? 0}%`,                color: 'text-accent-green  bg-accent-green/10  border-accent-green/20'  },
                { label: 'Skills',       value: `${learner?.skills?.length ?? 0} tracked`,    color: 'text-brand-400     bg-brand-500/10     border-brand-500/20'      },
                { label: 'Next action',  value: learner?.nextAction?.title ?? '—',            color: 'text-accent-yellow bg-accent-yellow/10 border-accent-yellow/20' },
                { label: 'Gaps',         value: `${(learner?.skills||[]).filter(s=>s.required>s.mastery).length} skills`, color: 'text-accent-red bg-accent-red/10 border-accent-red/20' },
              ].map(({ label, value, color }) => (
                <div key={label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${color}`}>
                  <span className="text-slate-500 font-normal">{label}:</span>
                  <span className="truncate max-w-[120px]">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom: scroll hint */}
        <div className="flex flex-col items-center gap-1 pb-2">
          <p className="text-[10px] text-slate-600 uppercase tracking-widest">Your Dashboard</p>
          <button
            onClick={scrollToDashboard}
            className="w-8 h-8 rounded-full bg-surface-700/60 border border-white/5 flex items-center justify-center hover:border-brand-500/40 hover:bg-brand-600/10 transition-all"
            aria-label="Scroll to dashboard"
          >
            <ChevronDown size={16} className="text-slate-500 animate-bounce" />
          </button>
        </div>
      </div>

      {/* ── PAGE 2: Full Dashboard ──────────────────────────────────────── */}
      <div id="dashboard-section" className="px-6 pb-10 space-y-6">

        {/* Divider */}
        <div className="flex items-center gap-3 pt-4">
          <div className="flex-1 h-px bg-white/5" />
          <span className="text-[10px] text-slate-600 uppercase tracking-widest font-mono">Dashboard</span>
          <div className="flex-1 h-px bg-white/5" />
        </div>

        {/* Readiness + Next Action */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Career Readiness */}
          <div className="glass-card p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-glow-brand opacity-60 pointer-events-none" />
            <p className="section-title">Career Readiness</p>
            <div className="flex items-end gap-6">
              <div>
                <div className="text-6xl font-black text-white leading-none">
                  {learner?.readiness}
                  <span className="text-3xl text-slate-500">%</span>
                </div>
                <div className="flex items-center gap-1.5 mt-3">
                  <div className="w-5 h-5 rounded-full bg-accent-green/10 flex items-center justify-center">
                    <TrendingUp size={11} className="text-accent-green" />
                  </div>
                  <span className="text-accent-green text-sm font-semibold">+{learner?.readinessDelta ?? 0}% this week</span>
                </div>
              </div>
              <div className="flex-1 mb-1">
                <svg viewBox="0 0 120 50" className="w-full opacity-60">
                  <defs>
                    <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4"/>
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  <path d="M0 40 Q20 35 35 30 Q55 22 75 28 Q90 32 105 12 L120 8" stroke="#6366f1" strokeWidth="2" fill="none" strokeLinecap="round"/>
                  <path d="M0 40 Q20 35 35 30 Q55 22 75 28 Q90 32 105 12 L120 8 L120 50 L0 50Z" fill="url(#sparkGrad)"/>
                  <circle cx="120" cy="8" r="3" fill="#22d3a4"/>
                </svg>
              </div>
            </div>
            <div className="mt-5 space-y-1.5">
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Progress to goal</span>
                <span className="font-mono">{learner?.readiness}/100</span>
              </div>
              <div className="h-2 bg-surface-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-600 to-accent-green rounded-full skill-bar-fill"
                  style={{ width: `${learner?.readiness ?? 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Next Best Action */}
          <div className="glass-card p-6 border-brand-500/20 bg-gradient-to-br from-brand-600/10 via-transparent to-transparent relative overflow-hidden">
            <div className="absolute top-4 right-4 w-20 h-20 rounded-full bg-accent-yellow/5 blur-2xl pointer-events-none" />
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-accent-yellow/10 border border-accent-yellow/20 flex items-center justify-center">
                <Zap size={13} className="text-accent-yellow" />
              </div>
              <p className="text-xs font-bold text-accent-yellow uppercase tracking-widest">⚡ Next Best Action</p>
            </div>
            <h3 className="text-xl font-black text-white leading-tight">{learner?.nextAction?.title}</h3>
            <div className="flex items-center gap-1.5 mt-1.5 mb-4">
              <Clock size={11} className="text-slate-500" />
              <span className="text-xs text-slate-500">{learner?.nextAction?.duration}</span>
            </div>
            <div className="bg-surface-700/60 rounded-xl p-3 mb-5 border border-white/5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">WHY?</p>
              <p className="text-sm text-slate-300 leading-relaxed">{learner?.nextAction?.reason}</p>
            </div>
            <button
              onClick={() => navigate('/next-action')}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              Start Now <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Skill Pulse */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="section-title mb-0">Your Skill Pulse</p>
            <span className="text-[10px] text-slate-600 font-mono">line = required level</span>
          </div>
          <div className="space-y-3.5">
            {topSkills.map(s => (
              <SkillBar key={s.name} name={s.name} mastery={s.mastery} required={s.required} showRequired />
            ))}
          </div>
          <button
            onClick={() => navigate('/twin')}
            className="mt-5 text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1.5 transition-colors font-medium"
          >
            View full skill profile <ArrowRight size={12} />
          </button>
        </div>

        {/* Weekly stats + Decay */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          <div className="glass-card p-5 lg:col-span-2">
            <p className="section-title flex items-center gap-1.5">
              <Flame size={12} className="text-accent-yellow" /> This Week
            </p>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Skills improved', value: learner?.weeklyStats?.skillsImproved   ?? 0,   icon: TrendingUp, color: 'text-accent-green',  bg: 'bg-accent-green/10'  },
                { label: 'Lessons done',    value: learner?.weeklyStats?.lessonsCompleted ?? 0,   icon: BookOpen,   color: 'text-brand-400',     bg: 'bg-brand-500/10'     },
                { label: 'Projects',        value: learner?.weeklyStats?.projectsDone     ?? 0,   icon: Code2,      color: 'text-accent-purple', bg: 'bg-accent-purple/10' },
                { label: 'Hours learned',   value: `${learner?.weeklyStats?.hoursLearned ?? 0}h`, icon: Trophy,     color: 'text-accent-yellow', bg: 'bg-accent-yellow/10' },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="bg-surface-700/40 rounded-2xl p-4 text-center">
                  <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center mx-auto mb-2`}>
                    <Icon size={16} className={color} />
                  </div>
                  <div className="text-2xl font-black text-white">{value}</div>
                  <div className="text-[10px] text-slate-500 mt-1 leading-tight">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-5 border-accent-yellow/10">
            <p className="section-title flex items-center gap-1.5">
              <AlertTriangle size={12} className="text-accent-yellow" />
              Knowledge Decay
            </p>
            <div className="space-y-2.5">
              {(learner?.decayAlerts || []).length > 0 ? (
                (learner?.decayAlerts || []).map(a => (
                  <div key={a.skill} className="flex items-center justify-between bg-surface-700/40 rounded-xl px-3 py-2.5 border border-white/5">
                    <div>
                      <p className="text-xs font-semibold text-white">{a.skill}</p>
                      <p className="text-[10px] text-slate-500">{a.daysSince}d without practice</p>
                    </div>
                    <span className={`badge text-xs font-bold font-mono ${
                      a.retention < 40
                        ? 'bg-accent-red/10 text-accent-red border border-accent-red/20'
                        : 'bg-accent-yellow/10 text-accent-yellow border border-accent-yellow/20'
                    }`}>
                      {a.retention}%
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 text-center py-4">No knowledge decay detected.</p>
              )}
            </div>
            <button
              onClick={() => navigate('/twin')}
              className="mt-3 text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1.5 transition-colors font-medium"
            >
              View all alerts <ArrowRight size={12} />
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

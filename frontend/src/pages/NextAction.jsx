import React from 'react'
import { Zap, Clock, ArrowRight, Circle, CheckCircle } from 'lucide-react'
import { useLearner } from '../store/LearnerContext'
import { useNavigate } from 'react-router-dom'

const ALL_ACTIONS = [
  { id: 'watch',    label: 'Watch ML Course',       desc: 'Passive learning, lower impact' },
  { id: 'assess',   label: 'Take Assessment',        desc: 'Updates your Digital Twin mastery score', selected: true },
  { id: 'practice', label: 'Practice Questions',     desc: 'Targeted weak-area drilling' },
  { id: 'project',  label: 'Start Deep Learning',    desc: 'Blocked — ML prerequisite not met' },
]

export default function NextAction() {
  const { learner } = useLearner()
  const navigate = useNavigate()
  const na = learner.nextAction

  return (
    <div className="p-6 fade-up flex justify-center">
      <div className="w-full max-w-xl space-y-6">
        {/* Hero card */}
        <div className="glass-card p-8 border-brand-500/20 bg-gradient-to-br from-brand-600/10 to-transparent text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent-yellow/10 border border-accent-yellow/20 mb-4">
            <Zap size={22} className="text-accent-yellow" />
          </div>
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Your Next Best Action</p>
          <h2 className="text-3xl font-black text-white mb-2">{na.title}</h2>
          <div className="flex items-center justify-center gap-1.5 text-slate-500 text-sm">
            <Clock size={13} />
            <span>{na.duration}</span>
          </div>
        </div>

        {/* Why */}
        <div className="glass-card p-6">
          <p className="section-title">Why this?</p>
          <p className="text-slate-300 text-sm leading-relaxed">{na.reason}</p>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-surface-700/40 rounded-xl p-3">
              <p className="text-[10px] text-slate-500 mb-1">Current mastery</p>
              <div className="flex items-end gap-1">
                <span className="text-2xl font-black text-accent-yellow font-mono">{Math.round(na.targetMastery * 100 - 9)}%</span>
              </div>
              <div className="h-1.5 bg-surface-600 rounded-full overflow-hidden mt-2">
                <div className="h-full bg-accent-yellow/80 rounded-full skill-bar-fill" style={{ width: '61%' }} />
              </div>
            </div>
            <div className="bg-surface-700/40 rounded-xl p-3">
              <p className="text-[10px] text-slate-500 mb-1">Target for unlock</p>
              <div className="flex items-end gap-1">
                <span className="text-2xl font-black text-accent-green font-mono">{Math.round(na.targetMastery * 100)}%</span>
              </div>
              <div className="h-1.5 bg-surface-600 rounded-full overflow-hidden mt-2">
                <div className="h-full bg-accent-green/80 rounded-full skill-bar-fill" style={{ width: `${na.targetMastery * 100}%` }} />
              </div>
            </div>
          </div>

          <div className="mt-4 bg-brand-600/10 border border-brand-500/20 rounded-xl p-3">
            <p className="text-xs text-slate-400">
              <span className="text-brand-400 font-semibold">Deep Learning</span> is blocked until this prerequisite is satisfied.
            </p>
          </div>
        </div>

        {/* Actions considered */}
        <div className="glass-card p-6">
          <p className="section-title">Actions considered</p>
          <div className="space-y-2">
            {ALL_ACTIONS.map(a => (
              <div key={a.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                a.selected
                  ? 'border-brand-500/40 bg-brand-600/10'
                  : 'border-white/5 bg-surface-700/30 opacity-60'
              }`}>
                {a.selected
                  ? <CheckCircle size={16} className="text-brand-400 shrink-0" />
                  : <Circle size={16} className="text-slate-600 shrink-0" />
                }
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${a.selected ? 'text-white' : 'text-slate-400'}`}>{a.label}</p>
                  <p className="text-xs text-slate-500">{a.desc}</p>
                </div>
                {a.selected && <span className="badge bg-brand-500/20 text-brand-400">Selected</span>}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => navigate('/assess')}
          className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base"
        >
          Start Assessment <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}

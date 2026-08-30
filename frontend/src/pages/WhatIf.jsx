import React, { useState } from 'react'
import { Sparkles, ArrowRight, Clock, RefreshCw, Loader } from 'lucide-react'
import { useLearner } from '../store/LearnerContext'

export default function WhatIf() {
  const { learner, runWhatIf } = useLearner()
  const [hoursPerWeek, setHoursPerWeek] = useState(7)
  const [skipSkill, setSkipSkill]       = useState('')
  const [projections, setProjections]   = useState(null)
  const [loading, setLoading]           = useState(false)
  const [simulated, setSimulated]       = useState(false)

  const allSkills = learner?.skills || []
  const gappedSkills = allSkills.filter(s => s.mastery < s.required)

  const baseReadiness = learner?.readiness ?? 0
  // Time projection: base = ~14 weeks at 7h/week
  const baseWeeks = 14
  const simWeeks  = Math.ceil(baseWeeks * (7 / Math.max(hoursPerWeek, 1)))
  const weekDelta = simWeeks - baseWeeks

  const handleSimulate = async () => {
    setLoading(true)
    try {
      const candidates = skipSkill
        ? [skipSkill]
        : gappedSkills.slice(0, 4).map(s => s.name)
      const results = await runWhatIf(candidates)
      setProjections(results)
      setSimulated(true)
    } catch (err) {
      console.error('What-if failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setSimulated(false)
    setProjections(null)
    setSkipSkill('')
    setHoursPerWeek(7)
  }

  const topProjection = projections?.[0] ?? null

  return (
    <div className="p-6 fade-up">
      <div className="max-w-xl mx-auto space-y-5">

        {/* Hero */}
        <div className="glass-card p-5 border-brand-500/20 bg-gradient-to-br from-brand-600/5 to-transparent">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={16} className="text-brand-400" />
            <p className="text-sm font-semibold text-white">What-If Simulator</p>
          </div>
          <p className="text-xs text-slate-500">
            Change constraints and the AI recalculates your roadmap impact instantly.
          </p>
        </div>

        {/* Controls */}
        <div className="glass-card p-6 space-y-5">

          {/* Hours per week */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-white">Available time per week</label>
              <span className="text-sm font-bold text-brand-400 font-mono">{hoursPerWeek}h</span>
            </div>
            <input
              type="range" min={1} max={20} value={hoursPerWeek}
              onChange={e => setHoursPerWeek(Number(e.target.value))}
              className="w-full h-2 bg-surface-600 rounded-full appearance-none cursor-pointer accent-brand-500"
            />
            <div className="flex justify-between text-[10px] text-slate-600 mt-1">
              <span>1h</span><span>10h</span><span>20h</span>
            </div>
          </div>

          {/* Skip skill (I already know…) */}
          <div>
            <label className="text-sm font-medium text-white block mb-2">I already know…</label>
            <select
              value={skipSkill}
              onChange={e => setSkipSkill(e.target.value)}
              className="w-full bg-surface-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-brand-500"
            >
              <option value="">— select a skill to mark as complete —</option>
              {gappedSkills.map(s => (
                <option key={s.name} value={s.name}>
                  {s.name} (currently {Math.round(s.mastery * 100)}%)
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSimulate}
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading
              ? <><Loader size={14} className="animate-spin" /> Simulating…</>
              : <><Sparkles size={14} /> Simulate Path</>
            }
          </button>
        </div>

        {/* Results */}
        {simulated && projections && (
          <div className="space-y-4 fade-up">

            {/* Top projection */}
            {topProjection && (
              <div className="glass-card p-6">
                <p className="section-title">Best Readiness Gain</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center bg-surface-700/40 rounded-xl p-4">
                    <p className="text-[10px] text-slate-500 mb-1">Current Path</p>
                    <p className="text-4xl font-black text-accent-yellow font-mono">{baseReadiness}%</p>
                    <p className="text-xs text-slate-500 mt-1">{baseWeeks} weeks</p>
                    <div className="mt-2 h-1.5 bg-surface-600 rounded-full overflow-hidden">
                      <div className="h-full bg-accent-yellow/80 rounded-full skill-bar-fill" style={{ width: `${baseReadiness}%` }} />
                    </div>
                  </div>
                  <div className="text-center bg-accent-green/5 border border-accent-green/20 rounded-xl p-4">
                    <p className="text-[10px] text-slate-500 mb-1">If you complete {topProjection.skill}</p>
                    <p className="text-4xl font-black text-accent-green font-mono">{topProjection.projected_readiness}%</p>
                    <p className="text-xs text-accent-green mt-1">+{topProjection.delta}% gain</p>
                    <div className="mt-2 h-1.5 bg-surface-600 rounded-full overflow-hidden">
                      <div className="h-full bg-accent-green rounded-full skill-bar-fill" style={{ width: `${topProjection.projected_readiness}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* All projections */}
            <div className="glass-card p-5">
              <p className="section-title">All Skill Projections</p>
              <div className="space-y-2">
                {projections.map(p => (
                  <div key={p.skill} className="flex items-center justify-between bg-surface-700/40 rounded-xl px-4 py-3">
                    <span className="text-sm font-medium text-white">{p.skill}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 font-mono">{p.current_readiness}%</span>
                      <ArrowRight size={12} className="text-slate-600" />
                      <span className="text-sm font-bold text-accent-green font-mono">{p.projected_readiness}%</span>
                      <span className={`badge text-xs font-mono font-bold ${p.delta > 0 ? 'bg-accent-green/10 text-accent-green' : 'bg-slate-700 text-slate-400'}`}>
                        +{p.delta}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Time impact */}
            {hoursPerWeek !== 7 && (
              <div className="glass-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={14} className="text-brand-400" />
                  <p className="text-sm font-semibold text-white">Time Impact</p>
                </div>
                <div className="flex items-center justify-between bg-surface-700/40 rounded-xl px-4 py-3">
                  <span className="text-sm text-slate-300">{hoursPerWeek}h/week vs 7h/week baseline</span>
                  <span className={`font-mono font-bold text-sm ${weekDelta > 0 ? 'text-accent-red' : 'text-accent-green'}`}>
                    {weekDelta > 0 ? `+${weekDelta}` : weekDelta} weeks
                  </span>
                </div>
              </div>
            )}

            <button onClick={handleReset} className="btn-ghost w-full flex items-center justify-center gap-2">
              <RefreshCw size={13} /> Reset Simulation
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

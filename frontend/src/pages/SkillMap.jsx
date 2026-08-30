import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Lock, CheckCircle, AlertCircle, Circle } from 'lucide-react'
import { useLearner } from '../store/LearnerContext'

const GRAPH = {
  'AI Engineer': {
    children: ['LLM Path', 'MLOps Path'],
  },
  'LLM Path': { children: ['RAG', 'Agents'] },
  'MLOps Path': { children: ['Docker', 'Cloud'] },
  'RAG': { children: ['Embeddings'] },
  'Agents': { children: [] },
  'Docker': { children: [] },
  'Cloud': { children: [] },
  'Embeddings': { children: ['PyTorch'] },
  'PyTorch': { children: ['Deep Learning'] },
  'Deep Learning': { children: ['Machine Learning'] },
  'Machine Learning': { children: ['Statistics', 'Feature Engineering'] },
  'Statistics': { children: ['Pandas'] },
  'Feature Engineering': { children: ['Pandas'] },
  'Pandas': { children: ['NumPy'] },
  'NumPy': { children: ['Python'] },
  'Python': { children: [] },
}

export default function SkillMap() {
  const { learner } = useLearner()
  const navigate = useNavigate()
  const [selected, setSelected] = useState(null)

  const skillMastery = Object.fromEntries(learner.skills.map(s => [s.name, s.mastery]))
  const skillRequired = Object.fromEntries(learner.skills.map(s => [s.name, s.required]))

  function getStatus(name) {
    const m = skillMastery[name]
    if (m === undefined) return 'unknown'
    if (m >= 0.75) return 'mastered'
    if (m >= 0.40) return 'learning'
    if (m > 0)     return 'gap'
    return 'notstarted'
  }

  const STATUS_STYLE = {
    mastered:   { dot: 'bg-accent-green shadow-[0_0_8px_#22d3a4]', text: 'text-accent-green', label: 'Mastered' },
    learning:   { dot: 'bg-accent-yellow shadow-[0_0_8px_#fbbf24]', text: 'text-accent-yellow', label: 'Learning' },
    gap:        { dot: 'bg-accent-red shadow-[0_0_8px_#f87171]', text: 'text-accent-red', label: 'Gap' },
    notstarted: { dot: 'bg-slate-600', text: 'text-slate-500', label: 'Not started' },
    unknown:    { dot: 'bg-slate-700', text: 'text-slate-600', label: '' },
  }

  // Flat list grouped by layers for visual display
  const layers = [
    ['Python'],
    ['NumPy', 'Pandas'],
    ['Statistics', 'Feature Engineering'],
    ['Machine Learning'],
    ['Deep Learning'],
    ['PyTorch', 'Embeddings'],
    ['RAG', 'Agents', 'Docker', 'Cloud'],
    ['LLM Path', 'MLOps Path'],
    ['AI Engineer'],
  ]

  const sel = selected ? learner.skills.find(s => s.name === selected) : null

  return (
    <div className="p-6 fade-up">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graph */}
        <div className="lg:col-span-2 glass-card p-6">
          <p className="section-title">Knowledge Graph — Click any node</p>
          <div className="space-y-4">
            {[...layers].reverse().map((layer, li) => (
              <div key={li} className="flex items-center justify-center gap-3 flex-wrap">
                {layer.map(name => {
                  const status = getStatus(name)
                  const style = STATUS_STYLE[status]
                  const isSelected = selected === name
                  return (
                    <button
                      key={name}
                      onClick={() => setSelected(isSelected ? null : name)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-200 text-sm font-medium
                        ${isSelected
                          ? 'border-brand-500 bg-brand-600/20 text-white shadow-glow'
                          : 'border-white/10 bg-surface-700/60 hover:border-white/20 hover:bg-surface-600/60 ' + style.text
                        }`}
                    >
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
                      {name}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-6 pt-4 border-t border-white/5 flex-wrap">
            {Object.entries(STATUS_STYLE).filter(([k]) => k !== 'unknown').map(([key, val]) => (
              <div key={key} className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className={`w-2 h-2 rounded-full ${val.dot}`} />
                {val.label}
              </div>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div className="glass-card p-6">
          {selected ? (
            <>
              <p className="section-title">Node Detail</p>
              <h3 className="text-xl font-bold text-white mb-1">{selected}</h3>
              {sel ? (
                <>
                  <div className="space-y-3 mt-4">
                    <div className="bg-surface-700/40 rounded-xl p-3">
                      <p className="text-[10px] text-slate-500 mb-1">Current Mastery</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-surface-600 rounded-full overflow-hidden">
                          <div className="h-full bg-accent-green rounded-full skill-bar-fill" style={{ width: `${sel.mastery * 100}%` }} />
                        </div>
                        <span className="text-sm font-bold text-white font-mono">{Math.round(sel.mastery * 100)}%</span>
                      </div>
                    </div>
                    <div className="bg-surface-700/40 rounded-xl p-3">
                      <p className="text-[10px] text-slate-500 mb-1">Required Level</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-surface-600 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-500 rounded-full skill-bar-fill" style={{ width: `${sel.required * 100}%` }} />
                        </div>
                        <span className="text-sm font-bold text-white font-mono">{Math.round(sel.required * 100)}%</span>
                      </div>
                    </div>
                    <div className="bg-surface-700/40 rounded-xl p-3">
                      <p className="text-[10px] text-slate-500 mb-1">Gap</p>
                      <p className="text-lg font-black text-accent-red font-mono">
                        {Math.max(0, Math.round((sel.required - sel.mastery) * 100))}%
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-[10px] text-slate-500 mb-2 uppercase tracking-wider">Last practiced</p>
                    <p className="text-sm text-slate-300">{sel.lastPracticed} days ago</p>
                  </div>
                  <button onClick={() => navigate('/roadmap')} className="btn-primary w-full mt-5 flex items-center justify-center gap-2">
                    View Roadmap <ArrowRight size={14} />
                  </button>
                </>
              ) : (
                <p className="text-slate-500 text-sm mt-3">No mastery data yet for this node.</p>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-12 h-12 rounded-xl bg-surface-700/60 flex items-center justify-center mb-3">
                <Circle size={20} className="text-slate-600" />
              </div>
              <p className="text-slate-500 text-sm">Click any node in the graph to see details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

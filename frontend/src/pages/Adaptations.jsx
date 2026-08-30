import React, { useState } from 'react'
import { 
  ArrowRight, Zap, RefreshCw, AlertTriangle, 
  HelpCircle, Compass, CheckCircle2, TrendingDown,
  GitFork, Cpu, Activity
} from 'lucide-react'
import { useLearner } from '../store/LearnerContext'

export default function Adaptations() {
  const { learner } = useLearner()
  const [showExplanation, setShowExplanation] = useState(true)

  const adaptationHistory = learner.adaptationHistory || []
  const hasHistory = adaptationHistory.length > 0

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto fade-up">
      {/* Page Header Card */}
      <div className="glass-card p-6 bg-gradient-to-br from-brand-600/10 via-transparent to-transparent relative overflow-hidden border-brand-500/20">
        <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-green/10 border border-accent-green/20">
          <Activity size={12} className="text-accent-green animate-pulse" />
          <span className="text-[10px] text-accent-green font-mono uppercase tracking-wider">Engine Active</span>
        </div>

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 shrink-0 shadow-glow">
            <GitFork size={22} className="rotate-90" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-black text-white">Path Adaptations</h2>
            <p className="text-sm text-slate-400 max-w-2xl">
              Every time you take an assessment, the AI re-evaluates your roadmap and adapts it based on demonstrated knowledge. Every quiz result can trigger a path change.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Summary Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent-green/10 flex items-center justify-center text-accent-green">
            <Cpu size={16} />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Engine Status</div>
            <div className="text-xs font-bold text-white">Dynamic Re-routing</div>
          </div>
        </div>
        
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent-purple/10 flex items-center justify-center text-accent-purple">
            <Zap size={16} />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Active Adapters</div>
            <div className="text-xs font-bold text-white">BKT + Decay Alerts</div>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent-yellow/10 flex items-center justify-center text-accent-yellow">
            <RefreshCw size={16} />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Total Adaptations</div>
            <div className="text-xs font-bold text-white">{adaptationHistory.length}</div>
          </div>
        </div>
      </div>

      {/* Adaptations List */}
      <div className="space-y-6">
        {hasHistory ? (
          adaptationHistory.map((adapt, idx) => (
            <div key={idx} className="glass-card p-6 border-white/5 bg-surface-800/40 relative group hover:border-white/10 transition-all duration-300">
              {/* Header / Trigger info */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-accent-red/10 border border-accent-red/20 flex items-center justify-center text-accent-red">
                    <TrendingDown size={16} />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Adaptation Trigger</div>
                    <div className="text-sm font-extrabold text-white">{adapt.trigger}</div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="badge bg-brand-500/15 border border-brand-500/35 text-brand-300 font-mono text-[10px]">
                    ID: ADAPT-{900 + idx}
                  </span>
                </div>
              </div>

              {/* Before / After Flow Comparison */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Before Column */}
                <div className="lg:col-span-5 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-slate-500" />
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Original Roadmap Spine</p>
                  </div>
                  
                  <div className="space-y-2">
                    {adapt.before.map((step, si) => (
                      <div key={si} className="relative">
                        <div className="flex items-center gap-3 px-3 py-2.5 bg-surface-700/35 rounded-xl border border-white/5 relative z-10">
                          <span className="text-xs font-mono text-slate-600 bg-surface-900/60 w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                            {si + 1}
                          </span>
                          <span className="text-xs font-medium text-slate-400 truncate">{step}</span>
                        </div>
                        {si < adapt.before.length - 1 && (
                          <div className="w-0.5 h-3 bg-slate-800 mx-auto my-0.5" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Transition arrow block */}
                <div className="lg:col-span-2 flex flex-col items-center justify-center py-4">
                  <div className="w-10 h-10 rounded-full bg-brand-600/10 border border-brand-500/20 flex items-center justify-center text-brand-400 shadow-glow mb-1">
                    <ArrowRight className="rotate-90 lg:rotate-0" size={16} />
                  </div>
                  <span className="text-[9px] text-brand-400 font-mono uppercase tracking-widest">Recalculating</span>
                </div>

                {/* After Column */}
                <div className="lg:col-span-5 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-accent-green" />
                    <p className="text-xs font-bold text-accent-green uppercase tracking-widest">Adapted Roadmap Spine</p>
                  </div>

                  <div className="space-y-2">
                    {adapt.after.map((step, si) => {
                      const isNew = !adapt.before.includes(step)
                      return (
                        <div key={si} className="relative">
                          <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border relative z-10 transition-all ${
                            isNew 
                              ? 'bg-accent-green/5 border-accent-green/30 shadow-[0_0_15px_rgba(34,211,164,0.05)]' 
                              : 'bg-surface-700/35 border-white/5'
                          }`}>
                            <span className="text-xs font-mono text-slate-500 bg-surface-900/60 w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                              {si + 1}
                            </span>
                            <span className={`text-xs font-semibold truncate ${isNew ? 'text-accent-green' : 'text-slate-300'}`}>
                              {step}
                            </span>
                            {isNew && (
                              <span className="ml-auto badge bg-accent-green/20 text-accent-green border border-accent-green/30 text-[9px] font-mono tracking-wide py-0.5 px-2">
                                INJECTED
                              </span>
                            )}
                          </div>
                          {si < adapt.after.length - 1 && (
                            <div className="w-0.5 h-3 bg-slate-800 mx-auto my-0.5" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Explanation box */}
              {showExplanation && (
                <div className="mt-6 p-4 rounded-xl bg-brand-600/10 border border-brand-500/20 text-left relative overflow-hidden">
                  <div className="absolute top-[-50px] right-[-50px] w-24 h-24 rounded-full bg-brand-500/5 blur-xl pointer-events-none" />
                  <div className="flex items-center gap-2 mb-2">
                    <Compass size={14} className="text-brand-400" />
                    <p className="text-[10px] font-bold text-brand-400 uppercase tracking-widest">AI Navigator Decision Reason</p>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    {adapt.reason}
                  </p>
                </div>
              )}
            </div>
          ))
        ) : (
          /* Real Empty State */
          <div className="glass-card p-12 border-dashed border-white/5 bg-surface-800/10 text-center flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/3 flex items-center justify-center text-slate-500">
              <HelpCircle size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-400">No adaptations triggered yet</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Future adaptations will appear here as you take assessments. Every quiz result can trigger a path change.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

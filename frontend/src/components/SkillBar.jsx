import React from 'react'

function masteryColor(v) {
  if (v >= 0.75) return 'from-accent-green to-emerald-400'
  if (v >= 0.50) return 'from-brand-500 to-brand-400'
  if (v >= 0.30) return 'from-accent-yellow to-amber-400'
  return 'from-accent-red to-rose-400'
}

export default function SkillBar({ name, mastery, required, showRequired = false, size = 'md' }) {
  const pct = Math.round(mastery * 100)
  const reqPct = required ? Math.round(required * 100) : null
  const h = size === 'sm' ? 'h-1' : 'h-2'

  return (
    <div className="flex items-center gap-3 group">
      <span className={`text-slate-300 font-medium shrink-0 ${size === 'sm' ? 'text-xs w-28' : 'text-sm w-36'}`}>
        {name}
      </span>
      <div className={`flex-1 bg-surface-600 rounded-full overflow-hidden ${h} relative`}>
        <div
          className={`${h} bg-gradient-to-r ${masteryColor(mastery)} rounded-full skill-bar-fill`}
          style={{ width: `${pct}%` }}
        />
        {showRequired && reqPct && (
          <div
            className="absolute top-0 h-full w-0.5 bg-white/30"
            style={{ left: `${reqPct}%` }}
          />
        )}
      </div>
      <span className={`font-mono font-semibold shrink-0 ${size === 'sm' ? 'text-xs w-8' : 'text-sm w-10'} text-right ${
        mastery >= 0.75 ? 'text-accent-green' :
        mastery >= 0.50 ? 'text-brand-400' :
        mastery >= 0.30 ? 'text-accent-yellow' : 'text-accent-red'
      }`}>
        {pct}%
      </span>
    </div>
  )
}

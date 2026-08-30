import React from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Brain, ArrowRight, XCircle, Activity, Shield } from 'lucide-react'
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, Tooltip
} from 'recharts'
import { useLearner } from '../store/LearnerContext'
import SkillBar from '../components/SkillBar'

export default function MyTwin() {
  const { learner } = useLearner()
  const navigate = useNavigate()

  const radarData = learner.skills.slice(0, 6).map(s => ({
    skill: s.name.length > 10 ? s.name.slice(0, 10) : s.name,
    mastery: Math.round(s.mastery * 100),
    required: Math.round(s.required * 100),
  }))

  const em = learner.evidenceOfMastery
  const evidenceItems = [
    { label: 'Course',  value: em.course,  color: 'from-brand-600 to-brand-400' },
    { label: 'Quiz',    value: em.quiz,    color: 'from-accent-purple to-brand-400' },
    { label: 'Coding',  value: em.coding,  color: 'from-accent-blue to-brand-500' },
    { label: 'Project', value: em.project, color: 'from-accent-green to-emerald-400' },
  ]
  const estimatedMastery = Math.round(
    em.course * 0.2 + em.quiz * 0.35 + em.coding * 0.25 + em.project * 0.2
  )

  return (
    <div className="p-6 space-y-6 fade-up">

      {/* Header quote */}
      <div className="glass-card p-4 border-brand-500/20 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-brand-600/20 flex items-center justify-center flex-shrink-0">
          <Activity size={15} className="text-brand-400" />
        </div>
        <p className="text-slate-400 text-sm italic">
          "Your knowledge is a living profile — not a checklist."
        </p>
      </div>

      {/* Radar + Knowledge State */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Radar */}
        <div className="glass-card p-6">
          <p className="section-title">Skill Radar</p>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#272b38" />
              <PolarAngleAxis
                dataKey="skill"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  background: '#1a1d27',
                  border: '1px solid #272b38',
                  borderRadius: 10,
                  fontSize: 12,
                }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Radar
                name="Required"
                dataKey="required"
                stroke="#4f46e5"
                fill="#4f46e5"
                fillOpacity={0.15}
              />
              <Radar
                name="Mastery"
                dataKey="mastery"
                stroke="#22d3a4"
                fill="#22d3a4"
                fillOpacity={0.25}
              />
            </RadarChart>
          </ResponsiveContainer>
          <div className="flex gap-5 justify-center mt-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <div className="w-4 h-0.5 bg-accent-green rounded" /> Mastery
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <div className="w-4 h-0.5 bg-brand-500 rounded" /> Required
            </div>
          </div>
        </div>

        {/* Knowledge state bars */}
        <div className="glass-card p-6">
          <p className="section-title">Knowledge State</p>
          <div className="space-y-3">
            {learner.skills.map(s => (
              <SkillBar
                key={s.name}
                name={s.name}
                mastery={s.mastery}
                required={s.required}
                showRequired
                size="sm"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Evidence of Mastery */}
      <div className="glass-card p-6">
        <p className="section-title flex items-center gap-1.5">
          <Brain size={12} className="text-brand-400" />
          Evidence of Mastery
        </p>
        <div className="grid grid-cols-4 gap-4 mb-6">
          {evidenceItems.map(({ label, value, color }) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-black text-white mb-2">{value}%</div>
              <div className="h-1.5 bg-surface-600 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full bg-gradient-to-r ${color} rounded-full skill-bar-fill`}
                  style={{ width: `${value}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                {label}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-white/5 pt-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 mb-1">Weighted Estimated Mastery</p>
            <p className="text-4xl font-black text-accent-green">{estimatedMastery}%</p>
          </div>
          <div className="text-right max-w-xs">
            <p className="text-xs text-slate-500 leading-relaxed">
              Course completion alone ≠ mastery. This score weighs quiz results,
              coding assessments and projects to give a true picture.
            </p>
          </div>
        </div>
      </div>

      {/* False Mastery Signals */}
      {learner.falseMastery.length > 0 && (
        <div className="glass-card p-6 border-accent-yellow/20">
          <p className="section-title flex items-center gap-1.5">
            <AlertTriangle size={12} className="text-accent-yellow" />
            False Mastery Signals
          </p>
          <div className="space-y-3">
            {learner.falseMastery.map(fm => (
              <div
                key={fm.skill}
                className="flex items-center gap-4 bg-accent-yellow/5 border border-accent-yellow/10 rounded-xl p-4"
              >
                <XCircle size={20} className="text-accent-yellow shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{fm.skill}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Self-reported:{' '}
                    <span className="text-accent-yellow font-mono font-bold">
                      {Math.round(fm.selfReported * 100)}%
                    </span>
                    {'  '}Demonstrated:{' '}
                    <span className="text-accent-red font-mono font-bold">
                      {Math.round(fm.demonstrated * 100)}%
                    </span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Gap of {Math.round((fm.selfReported - fm.demonstrated) * 100)}% —
                    practical assessment recommended
                  </p>
                </div>
                <button
                  onClick={() => navigate('/assess')}
                  className="btn-ghost text-xs flex-shrink-0"
                >
                  Assess
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Knowledge Decay Alerts */}
      <div className="glass-card p-6 border-accent-red/10">
        <p className="section-title flex items-center gap-1.5">
          <Shield size={12} className="text-accent-red" />
          Knowledge Decay Alerts
        </p>
        <div className="space-y-3">
          {learner.decayAlerts.map(a => (
            <div
              key={a.skill}
              className="flex items-center justify-between bg-surface-700/40 rounded-xl p-4"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{a.skill}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Not practiced for{' '}
                  <span className="text-accent-red font-semibold">{a.daysSince} days</span>
                  {' '}· Estimated retention:{' '}
                  <span className="font-mono font-semibold">{a.retention}%</span>
                </p>
                <div className="mt-2 h-1 bg-surface-600 rounded-full overflow-hidden w-32">
                  <div
                    className={`h-full rounded-full skill-bar-fill ${
                      a.retention < 40 ? 'bg-accent-red' : 'bg-accent-yellow'
                    }`}
                    style={{ width: `${a.retention}%` }}
                  />
                </div>
              </div>
              <button className="btn-ghost text-xs flex-shrink-0 ml-4">
                Quick Revision
              </button>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

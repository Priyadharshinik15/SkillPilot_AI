import React, { useState, useEffect } from 'react'
import { FlaskConical, Clock, ArrowRight, Star, CheckCircle, Loader } from 'lucide-react'
import { useLearner } from '../store/LearnerContext'

const DIFFICULTY_COLOR = {
  Beginner:     'bg-accent-green/10 text-accent-green',
  Intermediate: 'bg-accent-yellow/10 text-accent-yellow',
  Advanced:     'bg-accent-red/10 text-accent-red',
}

export default function ProjectLab() {
  const { learner, completeProject, api } = useLearner()
  const [completedIds, setCompletedIds]   = useState([])
  const [completing, setCompleting]       = useState(null)

  useEffect(() => {
    api.get('/api/projects/completed')
      .then(r => setCompletedIds(r.data.completed || []))
      .catch(() => {})
  }, [api])

  const handleComplete = async (projectId) => {
    setCompleting(projectId)
    try {
      await completeProject(projectId)
      setCompletedIds(prev => [...prev, projectId])
    } finally {
      setCompleting(null)
    }
  }

  const projects = learner?.projects || []

  return (
    <div className="p-6 fade-up space-y-6">
      <p className="text-slate-400 text-sm">
        Projects are selected from your current skill gaps — building is the fastest path to mastery.
      </p>

      {/* Recommended */}
      <div>
        <p className="section-title flex items-center gap-1.5">
          <Star size={12} className="text-accent-yellow" /> Recommended for you
        </p>
        {projects.filter(p => p.recommended).map(project => {
          const done = completedIds.includes(project.id)
          return (
            <div key={project.id} className={`glass-card p-6 mb-4 border-brand-500/20 bg-gradient-to-br from-brand-600/5 to-transparent ${done ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge ${DIFFICULTY_COLOR[project.difficulty] || 'bg-slate-700/50 text-slate-400'}`}>{project.difficulty}</span>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock size={10} /><span>{project.hours}h est.</span>
                    </div>
                    {done && <span className="badge bg-accent-green/10 text-accent-green">Completed</span>}
                  </div>
                  <h3 className="text-lg font-bold text-white">{project.title}</h3>
                </div>
                <FlaskConical size={20} className="text-brand-400 shrink-0" />
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {project.skills.map(s => (
                  <span key={s} className="badge bg-surface-600 text-slate-300">{s}</span>
                ))}
              </div>

              <div className="bg-brand-600/10 border border-brand-500/20 rounded-xl p-3 mb-4">
                <p className="text-xs text-slate-400">
                  <span className="text-brand-400 font-semibold">Why this?</span> {project.reason}
                </p>
              </div>

              {done ? (
                <div className="flex items-center gap-2 justify-center py-2.5 text-accent-green text-sm font-semibold">
                  <CheckCircle size={16} /> Project Completed
                </div>
              ) : (
                <button
                  onClick={() => handleComplete(project.id)}
                  disabled={completing === project.id}
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {completing === project.id
                    ? <><Loader size={14} className="animate-spin" /> Marking complete…</>
                    : <>Mark as Complete <ArrowRight size={14} /></>
                  }
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Other projects */}
      <div>
        <p className="section-title">More Projects</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.filter(p => !p.recommended).map(project => {
            const done = completedIds.includes(project.id)
            return (
              <div key={project.id} className={`glass-card p-5 hover:border-white/10 transition-all cursor-pointer group ${done ? 'opacity-60' : ''}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`badge ${DIFFICULTY_COLOR[project.difficulty] || 'bg-slate-700/50 text-slate-400'}`}>{project.difficulty}</span>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock size={10} /><span>{project.hours}h</span>
                  </div>
                  {done && <span className="badge bg-accent-green/10 text-accent-green text-[9px]">Done</span>}
                </div>
                <h3 className="text-sm font-bold text-white mb-2">{project.title}</h3>
                <div className="flex flex-wrap gap-1 mb-3">
                  {project.skills.map(s => (
                    <span key={s} className="badge bg-surface-600/60 text-slate-400 text-[10px]">{s}</span>
                  ))}
                </div>
                <p className="text-xs text-slate-500">{project.reason}</p>
                {!done && (
                  <button
                    onClick={() => handleComplete(project.id)}
                    className="mt-3 flex items-center gap-1 text-brand-400 text-xs font-medium hover:text-brand-300 transition-colors"
                    disabled={completing === project.id}
                  >
                    {completing === project.id
                      ? <Loader size={11} className="animate-spin" />
                      : <><CheckCircle size={11} /> Mark complete</>
                    }
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {projects.length === 0 && (
        <div className="glass-card p-8 text-center">
          <p className="text-slate-500 text-sm">No projects loaded yet. Complete goal setup to see recommendations.</p>
        </div>
      )}
    </div>
  )
}

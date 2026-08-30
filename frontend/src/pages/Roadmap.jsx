import React, { useState } from 'react'
import { 
  CheckCircle, Lock, AlertCircle, ChevronDown, 
  ArrowRight, Calendar, Clock, Printer, Sparkles, Award
} from 'lucide-react'
import { useLearner } from '../store/LearnerContext'
import { useNavigate } from 'react-router-dom'

const DIFFICULTY_COLOR = {
  easy: 'bg-accent-green/10 text-accent-green border-accent-green/20',
  medium: 'bg-accent-yellow/10 text-accent-yellow border-accent-yellow/20',
  hard: 'bg-accent-red/10 text-accent-red border-accent-red/20',
}

const SKILL_HOURS = {
  "Python": 10, "NumPy": 5, "Pandas": 8, "Statistics": 12,
  "Machine Learning": 15, "Feature Engineering": 8, "Deep Learning": 18,
  "PyTorch": 12, "MLOps": 10, "Docker": 6, "NLP": 12,
  "LLM": 15, "RAG": 10, "SQL": 6, "Data Visualization": 6,
  "HTML": 4, "CSS": 4, "JavaScript": 8, "React": 12,
  "Node.js": 12, "REST APIs": 6, "Databases": 8
}

const SKILL_TOPICS = {
  "Python": ["Syntax & Control Flow", "Functions & Lists", "OOP Principles"],
  "NumPy": ["NDArrays & Operations", "Vectorization", "Broadcasting"],
  "Pandas": ["DataFrames Operations", "Grouping & Merging", "Handling Nulls"],
  "Statistics": ["Probability & Distributions", "Hypothesis Tests", "Regressions"],
  "Machine Learning": ["Supervised Learning", "Linear Models", "Trees & Ensembles"],
  "Feature Engineering": ["Scaling & Encoding", "Outlier Management", "Data Imputation"],
  "Deep Learning": ["Neural Networks", "Backpropagation", "Gradient Descent"],
  "PyTorch": ["Tensor Algebra", "Autograd Mechanics", "Custom Training Loops"],
  "MLOps": ["Model Tracking", "Artifact Versioning", "Deployment Pipelines"],
  "Docker": ["Containers Isolation", "Dockerfiles", "Multi-stage Builds"],
  "NLP": ["Tokenization Methods", "Transformers Architecture", "GPT Fine-tuning"],
  "LLM": ["Prompt Engineering", "Vector Databases", "LangChain Libraries"],
  "RAG": ["Semantic Chunking", "Embedding Models", "Retrieval Evaluation"],
  "SQL": ["Select Queries & Joins", "Aggregations", "Index Optimizations"],
  "Data Visualization": ["Matplotlib & Seaborn", "Plotly Charts", "Data Dashboards"],
  "HTML": ["DOM Elements", "Forms & Input Types", "Semantic Markups"],
  "CSS": ["Flexbox & Grid layouts", "Transitions & Keyframes", "Media Queries"],
  "JavaScript": ["Array Callbacks", "Promises & Async/Await", "DOM Event Handling"],
  "React": ["Functional Components", "State hooks (useState, useEffect)", "Context API"],
  "Node.js": ["Express Server APIs", "Middlewares Routing", "Event loops"],
  "REST APIs": ["RESTful Standards", "JSON Validation", "Status Codes"],
  "Databases": ["Relational schemas", "NoSQL key-value stores", "Data Migrations"]
}

function statusConfig(status) {
  switch (status) {
    case 'completed':    return { color: 'border-accent-green/30 bg-accent-green/5', badge: 'bg-accent-green/10 text-accent-green', icon: CheckCircle, iconColor: 'text-accent-green', label: 'Completed' }
    case 'in_progress':  return { color: 'border-brand-500/30 bg-brand-600/5',       badge: 'bg-brand-500/10 text-brand-400',   icon: ArrowRight,   iconColor: 'text-brand-400',   label: 'In Progress' }
    case 'locked':       return { color: 'border-white/5 bg-surface-700/30',         badge: 'bg-slate-700/50 text-slate-500',    icon: Lock,         iconColor: 'text-slate-600',   label: 'Locked' }
    default:             return { color: 'border-white/5',                            badge: 'bg-slate-700/50 text-slate-500',    icon: AlertCircle,  iconColor: 'text-slate-600',   label: '' }
  }
}

export default function Roadmap() {
  const { learner } = useLearner()
  const navigate = useNavigate()
  const [hoursPerDay, setHoursPerDay] = useState(2) // Default 2 hours per day

  // 1. Calculate remaining study hours for uncompleted roadmap skills
  const remainingSkills = []
  learner.roadmap.forEach(phase => {
    phase.skills.forEach(skillName => {
      const s = learner.skills.find(x => x.name === skillName)
      const mastery = s ? s.mastery : 0.0
      const required = s ? s.required : 0.7
      if (mastery < required) {
        const baseHours = SKILL_HOURS[skillName] || 8
        const remainingHours = Math.max(1, Math.round(baseHours * (required - mastery)))
        remainingSkills.push({
          name: skillName,
          remainingHours,
          topics: SKILL_TOPICS[skillName] || ["General concepts"]
        })
      }
    })
  })

  // 2. Distribute remaining study hours into daily schedules matching the slider
  const dailySchedule = []
  let dayCounter = 1
  let currentDayHours = 0
  let currentDayTasks = []

  remainingSkills.forEach(skill => {
    let skillHoursLeft = skill.remainingHours
    let topicIndex = 0

    while (skillHoursLeft > 0) {
      const hoursToAllocate = Math.min(hoursPerDay - currentDayHours, skillHoursLeft)
      const topic = skill.topics[topicIndex % skill.topics.length]
      
      currentDayTasks.push({
        skill: skill.name,
        topic,
        hours: hoursToAllocate
      })

      skillHoursLeft -= hoursToAllocate
      currentDayHours += hoursToAllocate
      topicIndex++

      if (currentDayHours >= hoursPerDay) {
        dailySchedule.push({
          day: dayCounter,
          tasks: [...currentDayTasks]
        })
        dayCounter++
        currentDayHours = 0
        currentDayTasks = []
      }
    }
  })

  if (currentDayTasks.length > 0) {
    dailySchedule.push({
      day: dayCounter,
      tasks: currentDayTasks
    })
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto relative">
      {/* Print-only CSS block */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          aside, header, nav, .no-print, button, input[type="range"] {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          main {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            overflow: visible !important;
          }
          .print-full-width {
            width: 100% !important;
            max-width: 100% !important;
            border: none !important;
            background: none !important;
            padding: 0 !important;
          }
          .glass-card {
            border: 1px solid #ccc !important;
            background: white !important;
            box-shadow: none !important;
            color: black !important;
            margin-bottom: 12px !important;
            page-break-inside: avoid;
          }
          h1, h2, h3, h4, span, p, div {
            color: black !important;
          }
          .skill-bar-fill {
            background: #4f46e5 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}} />

      {/* Main Roadmap Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4 no-print">
        <div>
          <h2 className="text-xl font-black text-white">Dynamic Learning Roadmap</h2>
          <p className="text-sm text-slate-400">Track milestones and configure study plans.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="glass-card px-4 py-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-brand-500 glow-dot" />
            <span className="text-xs font-semibold text-white">🎯 {learner.goal}</span>
          </div>
          <button 
            onClick={handlePrint}
            className="px-4 py-2 text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-white rounded-xl transition-all flex items-center gap-1.5"
          >
            <Printer size={13} /> Export PDF Report
          </button>
        </div>
      </div>

      {/* Print Header Report Layout (Visible only in print) */}
      <div className="hidden print:block text-left border-b-2 border-black pb-4 mb-6">
        <h1 className="text-3xl font-black tracking-tight uppercase">SkillPilot AI Roadmap Report</h1>
        <p className="text-sm text-gray-600 mt-1">Generated on: {new Date().toLocaleDateString()} for **{learner.name}**</p>
        <div className="grid grid-cols-3 gap-4 mt-4 text-xs font-mono">
          <div><strong>Primary Career Goal:</strong> {learner.goal}</div>
          <div><strong>Current Career Readiness:</strong> {learner.readiness}%</div>
          <div><strong>Daily Study Commitment:</strong> {hoursPerDay} hours/day</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print-full-width">
        {/* Left Column: Roadmap Milestones */}
        <div className="lg:col-span-7 space-y-4 print-full-width">
          <p className="section-title text-xs font-bold text-slate-400 uppercase tracking-widest no-print">Milestone Timeline</p>
          
          <div className="relative">
            {/* Timeline backbone connector */}
            <div className="absolute left-6 top-2 bottom-2 w-px bg-gradient-to-b from-brand-600/40 via-brand-600/10 to-transparent no-print" />

            <div className="space-y-4">
              {learner.roadmap.map((phase, i) => {
                const cfg = statusConfig(phase.status)
                const Icon = cfg.icon
                return (
                  <div key={phase.id} className="relative pl-12 print:pl-0">
                    {/* Circle timeline indicators */}
                    <div className={`absolute left-3 top-5 w-6 h-6 rounded-full flex items-center justify-center border-2 no-print ${
                      phase.status === 'locked' ? 'border-slate-700 bg-surface-800' :
                      phase.status === 'in_progress' ? 'border-brand-500 bg-brand-600/20 shadow-glow' :
                      'border-accent-green bg-accent-green/20'
                    }`}>
                      <Icon size={11} className={cfg.iconColor} />
                    </div>

                    <div className={`glass-card p-5 border ${cfg.color} ${phase.status === 'locked' ? 'opacity-65' : ''}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-mono text-slate-500">{phase.phase}</span>
                            <span className={`badge text-[9px] font-mono ${cfg.badge}`}>{cfg.label}</span>
                            {phase.assessmentRequired && (
                              <span className="badge bg-accent-yellow/10 text-accent-yellow border border-accent-yellow/20 text-[9px]">
                                Quiz Required
                              </span>
                            )}
                          </div>
                          <h3 className="text-base font-bold text-white">{phase.title}</h3>
                        </div>
                        {phase.status !== 'locked' && (
                          <span className="text-lg font-black text-white font-mono">{phase.progress}%</span>
                        )}
                      </div>

                      {/* Skills in phase */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {phase.skills.map(skill => {
                          const s = learner.skills.find(x => x.name === skill)
                          const pct = s ? Math.round(s.mastery * 100) : null
                          return (
                            <span key={skill} className={`badge text-[10px] border ${
                              pct === null ? 'bg-slate-700/50 text-slate-500 border-white/5' :
                              pct >= 75 ? 'bg-accent-green/10 text-accent-green border-accent-green/20' :
                              pct >= 40 ? 'bg-brand-500/10 text-brand-400 border-brand-500/20' :
                              'bg-accent-red/10 text-accent-red border-accent-red/20'
                            }`}>
                              {skill}{pct !== null ? ` ${pct}%` : ''}
                            </span>
                          )
                        })}
                      </div>

                      {/* Progress strip */}
                      {phase.status !== 'locked' ? (
                        <div className="h-1.5 bg-surface-600 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full skill-bar-fill animate-pulse-slow"
                            style={{ width: `${phase.progress}%` }}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 mt-1 no-print">
                          <Lock size={11} className="text-slate-600" />
                          <span className="text-xs text-slate-500">{phase.lockReason}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Daily Schedule Planner */}
        <div className="lg:col-span-5 space-y-4 print-full-width">
          <p className="section-title text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 no-print">
            <Calendar size={13} className="text-brand-400" /> Study Intensity Scheduler
          </p>

          {/* Day Hour Config card */}
          <div className="glass-card p-5 space-y-4 no-print">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-400">Available study time:</span>
              <span className="text-brand-400 font-mono">{hoursPerDay} Hours / Day</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="8"
              step="0.5"
              value={hoursPerDay}
              onChange={e => setHoursPerDay(parseFloat(e.target.value))}
              className="w-full accent-brand-500 h-1 bg-surface-700 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Adjust your daily available hours. The scheduler will partition your skill gaps into specific daily tasks automatically.
            </p>
          </div>

          {/* Daily Schedule Display list */}
          <div className="space-y-3 print-full-width">
            <div className="flex items-center justify-between mb-1">
              <p className="section-title text-xs font-bold text-slate-400 uppercase tracking-widest mb-0">Daily Goal Schedule</p>
              <span className="text-[9px] text-slate-500 font-mono no-print">
                {dailySchedule.length} days total
              </span>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 print:max-h-none print:overflow-visible">
              {dailySchedule.slice(0, 15).map(day => (
                <div key={day.day} className="glass-card p-4 border-white/5 bg-surface-800/20 flex gap-3.5 items-start relative hover:border-white/10 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex flex-col items-center justify-center shrink-0">
                    <span className="text-[8px] text-brand-400 font-mono uppercase tracking-tighter">Day</span>
                    <span className="text-sm font-black text-white leading-none mt-0.5">{day.day}</span>
                  </div>

                  <div className="space-y-2 flex-1 text-left min-w-0">
                    <div className="space-y-1">
                      {day.tasks.map((task, ti) => (
                        <div key={ti} className="flex justify-between items-start text-xs gap-3">
                          <div className="min-w-0">
                            <span className="font-bold text-white block truncate">{task.skill}</span>
                            <span className="text-[10px] text-slate-400 block truncate">Topic: {task.topic}</span>
                          </div>
                          <span className="bg-surface-700/60 border border-white/5 px-2 py-0.5 rounded font-mono text-[9px] text-slate-400 shrink-0">
                            {task.hours}h
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {dailySchedule.length > 15 && (
                <div className="p-3 text-center text-slate-500 text-xs border border-dashed border-white/5 rounded-xl no-print">
                  + {dailySchedule.length - 15} additional study days. Download the report to view the full schedule.
                </div>
              )}

              {dailySchedule.length === 0 && (
                <div className="glass-card p-8 border-dashed border-white/5 text-center flex flex-col items-center justify-center gap-2">
                  <Award size={20} className="text-accent-green" />
                  <span className="text-xs font-bold text-slate-400">All targets fully completed!</span>
                  <span className="text-[10px] text-slate-500">Your readiness index is at 100%. No further gaps to schedule.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

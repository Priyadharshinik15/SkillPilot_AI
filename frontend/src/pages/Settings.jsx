import React, { useState } from 'react'
import { Settings as SettingsIcon, Shield, RefreshCw, AlertOctagon, CheckCircle2, User, Target, Key, Download, FileText, Loader } from 'lucide-react'
import { useLearner } from '../store/LearnerContext'
import { exportPDF } from '../utils/exportPDF'

export default function Settings() {
  const { learner, analyzeGoal, resetLearner, simulateDecay, simulateAdaptation } = useLearner()
  
  const [name, setName] = useState(learner.name)
  const [primaryGoal, setPrimaryGoal] = useState(learner.goal)
  const [experience, setExperience] = useState(learner.experience || 'intermediate')
  const [secondGoal, setSecondGoal] = useState('None')
  const [weeklyHours, setWeeklyHours] = useState(7)
  
  const [isUpdating, setIsUpdating] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [isSimulating, setIsSimulating] = useState(false)
  const [isSimulatingAdaptation, setIsSimulatingAdaptation] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const handleExportPDF = async () => {
    setIsExporting(true)
    setSuccessMsg('')
    setErrorMsg('')
    try {
      exportPDF(learner)
      setSuccessMsg(`Report saved — check your Downloads folder for SkillPilot_Report_${(learner.name||'learner').replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.pdf`)
    } catch (err) {
      setErrorMsg('PDF export failed. Please try again.')
      console.error(err)
    } finally {
      setIsExporting(false)
    }
  }

  const handleSimulateDecay = async () => {
    setIsSimulating(true)
    setSuccessMsg('')
    setErrorMsg('')
    try {
      const res = await simulateDecay()
      if (res.success) {
        setSuccessMsg('Successfully simulated memory decay! Overdue reviews added for Statistics, PyTorch, and MLOps.')
      } else {
        setErrorMsg(res.error || 'Failed to simulate decay.')
      }
    } catch (err) {
      setErrorMsg('Failed to simulate knowledge decay.')
    } finally {
      setIsSimulating(false)
    }
  }

  const handleSimulateAdaptation = async () => {
    setIsSimulatingAdaptation(true)
    setSuccessMsg('')
    setErrorMsg('')
    try {
      const res = await simulateAdaptation()
      if (res.success) {
        setSuccessMsg('Successfully simulated path adaptation! Revision module injected for Machine Learning.')
      } else {
        setErrorMsg(res.error || 'Failed to simulate path adaptation.')
      }
    } catch (err) {
      setErrorMsg('Failed to simulate path adaptation.')
    } finally {
      setIsSimulatingAdaptation(false)
    }
  }

  const handleUpdatePath = async (e) => {
    e.preventDefault()
    setIsUpdating(true)
    setSuccessMsg('')
    setErrorMsg('')
    try {
      const goalText = `My name is ${name}. I want to become a ${primaryGoal}. My current experience level is ${experience}.`
      await analyzeGoal(goalText, secondGoal)
      setSuccessMsg('Roadmap and career targets successfully updated in real-time!')
    } catch (err) {
      setErrorMsg('Failed to update targets. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleResetLogs = async () => {
    if (!window.confirm("Are you absolutely sure you want to delete all quiz history, completed projects, review schedules, and adaptations? This cannot be undone.")) {
      return
    }
    setIsResetting(true)
    setSuccessMsg('')
    setErrorMsg('')
    try {
      await resetLearner()
      setSuccessMsg('All databases successfully reset to default baseline parameters.')
    } catch (err) {
      setErrorMsg('Failed to reset. Please try again.')
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto fade-up">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 shrink-0 shadow-glow">
          <SettingsIcon size={22} />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-black text-white">Settings</h2>
          <p className="text-sm text-slate-400">
            Manage your career targets, study parameters, and database state.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-accent-green/10 border border-accent-green/20 text-accent-green text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-accent-red/10 border border-accent-red/20 text-accent-red text-xs rounded-xl flex items-center gap-2">
          <AlertOctagon size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Career Goal form */}
      <form onSubmit={handleUpdatePath} className="glass-card p-6 space-y-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-3">
          <Target size={16} className="text-brand-400" /> Career Target & Profile Analysis
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Full Name</label>
            <div className="relative">
              <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-surface-900/50 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Experience Level</label>
            <select
              value={experience}
              onChange={e => setExperience(e.target.value)}
              className="w-full bg-surface-900/50 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Primary Target Role</label>
            <select
              value={primaryGoal}
              onChange={e => setPrimaryGoal(e.target.value)}
              className="w-full bg-surface-900/50 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
            >
              <option value="AI Engineer">AI Engineer</option>
              <option value="Data Scientist">Data Scientist</option>
              <option value="Full Stack Developer">Full Stack Developer</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Optional Secondary Target</label>
            <select
              value={secondGoal}
              onChange={e => setSecondGoal(e.target.value)}
              className="w-full bg-surface-900/50 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
            >
              <option value="None">None (Single Spine Path)</option>
              <option value="AI Engineer">AI Engineer</option>
              <option value="Data Scientist">Data Scientist</option>
              <option value="Full Stack Developer">Full Stack Developer</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={isUpdating}
          className="btn-primary flex items-center gap-2 text-xs h-11 px-6 font-bold disabled:opacity-50"
        >
          {isUpdating ? 'Regenerating Paths...' : 'Save & Recalculate Roadmap'} <RefreshCw size={14} className={isUpdating ? 'animate-spin' : ''} />
        </button>
      </form>

      {/* Target Learning Intensity */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-3">
          <Key size={16} className="text-accent-yellow" /> Study Schedule parameters
        </h3>
        
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-slate-400">Target Study Commitment:</span>
            <span className="text-brand-400 font-mono">{weeklyHours} Hours / Week</span>
          </div>
          <input
            type="range"
            min="2"
            max="40"
            value={weeklyHours}
            onChange={e => setWeeklyHours(Number(e.target.value))}
            className="w-full accent-brand-500 h-1 bg-surface-700 rounded-lg appearance-none cursor-pointer"
          />
          <p className="text-[10px] text-slate-500 mt-1 leading-normal">
            Used by the What-If Simulator to estimate roadmap milestone durations and timeline delta calculations.
          </p>
        </div>
      </div>

      {/* Simulation & Testing Tools */}
      <div className="glass-card p-6 border-accent-yellow/20 relative overflow-hidden">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-3">
          <RefreshCw size={16} className="text-accent-yellow" /> Simulation & Testing Tools
        </h3>

        <div className="space-y-4 mt-4">
          <p className="text-xs text-slate-400 leading-normal">
            For demo/testing purposes, you can simulate knowledge decay and path adaptations. This will insert overdue review schedules or dynamic path revision overrides into your active profile, triggering memory warnings, top-bar alerts, and custom milestones.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSimulateDecay}
              disabled={isSimulating}
              className="px-4 py-2.5 bg-brand-500/10 hover:bg-brand-500 text-brand-400 hover:text-white border border-brand-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
            >
              {isSimulating ? 'Simulating Decay...' : 'Simulate Knowledge Decay'} <RefreshCw size={14} className={isSimulating ? 'animate-spin' : ''} />
            </button>

            <button
              type="button"
              onClick={handleSimulateAdaptation}
              disabled={isSimulatingAdaptation}
              className="px-4 py-2.5 bg-accent-purple/10 hover:bg-accent-purple text-accent-purple hover:text-white border border-accent-purple/20 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
            >
              {isSimulatingAdaptation ? 'Simulating Adaptation...' : 'Simulate Path Adaptation'} <RefreshCw size={14} className={isSimulatingAdaptation ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Export PDF Report */}
      <div className="glass-card p-6 border-accent-green/20">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-3">
          <FileText size={16} className="text-accent-green" /> Export Progress Report
        </h3>
        <div className="space-y-4 mt-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            Download a full PDF report of your learning profile — includes skill mastery bars, 
            roadmap phases, top gaps, knowledge decay alerts, AI path adaptations, and your 
            next best action. Saved directly to your local Downloads folder.
          </p>

          {/* Report preview summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Readiness',    value: `${learner.readiness ?? 0}%`,                color: 'text-accent-green'  },
              { label: 'Skills',       value: `${learner.skills?.length ?? 0} tracked`,    color: 'text-brand-400'     },
              { label: 'Phases',       value: `${learner.roadmap?.length ?? 0} phases`,    color: 'text-accent-yellow' },
              { label: 'Adaptations',  value: `${learner.adaptationHistory?.length ?? 0}`, color: 'text-accent-purple' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-surface-700/40 rounded-xl p-3 text-center">
                <p className={`text-lg font-black font-mono ${color}`}>{value}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center gap-2.5 px-6 py-3 bg-accent-green/10 hover:bg-accent-green text-accent-green hover:text-white border border-accent-green/20 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
          >
            {isExporting
              ? <><Loader size={15} className="animate-spin" /> Generating PDF…</>
              : <><Download size={15} /> Export PDF Report</>
            }
          </button>
        </div>
      </div>

      {/* Reset Section */}
      <div className="glass-card p-6 border-accent-red/20 bg-accent-red/2 relative overflow-hidden">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-accent-red/10 pb-3">
          <AlertOctagon size={16} className="text-accent-red" /> Dangerous Operations
        </h3>

        <div className="space-y-4 mt-4">
          <p className="text-xs text-slate-400 leading-normal">
            Permanently clear all learning records. This removes all quiz results, space-repetition schedules, completed projects, and dynamic path adaptations, returning your knowledge graph to its initial baseline level.
          </p>

          <button
            type="button"
            onClick={handleResetLogs}
            disabled={isResetting}
            className="px-4 py-2.5 bg-accent-red/10 hover:bg-accent-red text-accent-red hover:text-white border border-accent-red/20 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
          >
            {isResetting ? 'Wiping Databases...' : 'Wipe Learning History & Reset'} <Shield size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

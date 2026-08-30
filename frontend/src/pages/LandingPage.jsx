import React, { useState } from 'react'
import { useLearner } from '../store/LearnerContext'
import { 
  Zap, ArrowRight, Brain, Compass, LineChart, 
  Calendar, MessageSquare, Dna, Sparkles, Clock, 
  User, Lock, CheckCircle2, Shield, Activity
} from 'lucide-react'

export default function LandingPage() {
  const { login, register, loading } = useLearner()
  const [activeTab, setActiveTab] = useState('login') // 'login' | 'signup'
  
  // Auth states
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')         // display name (signup only)
  const [experience, setExperience] = useState('intermediate')
  const [primaryGoal, setPrimaryGoal] = useState('AI Engineer')
  const [secondGoal, setSecondGoal] = useState('None')
  const [errorMsg, setErrorMsg] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    if (!username || !password) {
      setErrorMsg('Please enter both username and password.')
      return
    }
    const res = await login(username, password)
    if (!res.success) {
      setErrorMsg(res.error || 'Invalid credentials.')
    }
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    if (!username || !password || !name) {
      setErrorMsg('Email, username and password are required.')
      return
    }
    const finalGoalText = `I want to become a ${primaryGoal}. My current experience is ${experience}.`
    const res = await register(
      username, 
      password, 
      name, 
      finalGoalText, 
      experience, 
      secondGoal
    )
    if (!res.success) {
      setErrorMsg(res.error || 'Registration failed.')
    }
  }

  return (
    <div className="min-h-screen bg-surface-900 text-white font-sans overflow-x-hidden relative">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-600/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-accent-purple/10 blur-[180px] pointer-events-none" />
      <div className="absolute top-[30%] right-[10%] w-[30%] h-[30%] rounded-full bg-accent-green/5 blur-[120px] pointer-events-none" />

      {/* Navigation */}
      <header className="sticky top-0 z-50 h-16 flex items-center justify-between px-6 lg:px-16 border-b border-white/5 bg-surface-900/70 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center shadow-glow">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <div className="text-base font-extrabold text-white tracking-wide leading-none">SkillPilot</div>
            <div className="text-[9px] text-brand-400 font-mono uppercase tracking-widest mt-0.5">AI Navigator</div>
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-sm text-slate-400 font-medium">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#simulator" className="hover:text-white transition-colors">BKT & Decay Model</a>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setActiveTab('login')
              document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 rounded-xl border border-white/5 transition-all"
          >
            Sign In
          </button>
          <button 
            onClick={() => {
              setActiveTab('signup')
              document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="px-4 py-2 text-xs font-semibold bg-brand-600 hover:bg-brand-500 rounded-xl shadow-glow hover:shadow-glow-bright transition-all"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Main Hero & Auth Section */}
      <section className="relative pt-16 pb-20 px-6 lg:px-16 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Hero Copy */}
        <div className="lg:col-span-7 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-semibold">
            <Sparkles size={12} className="animate-pulse" />
            <span>Next-Generation AI Career Roadmap Builder</span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
            Navigate Your Learning <br />
            <span className="bg-gradient-to-r from-brand-400 via-accent-purple to-accent-green bg-clip-text text-transparent">
              With AI-Driven Precision
            </span>
          </h1>

          <p className="text-base md:text-lg text-slate-400 leading-relaxed max-w-xl">
            SkillPilot maps your path to career readiness using real-time skill gaps, memory decay tracking, and adaptive Bayesian quiz modeling. Stop guessing what to learn next.
          </p>

          {/* Quick Statistics */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/5 max-w-lg">
            <div>
              <div className="text-2xl font-extrabold text-white">Adaptive</div>
              <div className="text-xs text-slate-500">Roadmap Routing</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-white">BKT-Based</div>
              <div className="text-xs text-slate-500">Quiz Calibration</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-white">SM-2</div>
              <div className="text-xs text-slate-500">Spaced Repetition</div>
            </div>
          </div>
        </div>

        {/* Auth / Demo Form Card */}
        <div id="auth-section" className="lg:col-span-5 w-full">
          <div className="glass-card p-6 border-white/10 shadow-2xl relative overflow-hidden bg-surface-800/80 backdrop-blur-xl">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-brand-500 via-accent-purple to-accent-green" />
            
            {/* Form tabs */}
            <div className="grid grid-cols-2 gap-1 bg-surface-900/60 p-1.5 rounded-xl border border-white/5 mb-6">
              {[
                { id: 'login', label: 'Sign In' },
                { id: 'signup', label: 'Sign Up' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id)
                    setErrorMsg('')
                  }}
                  className={`py-2 text-[11px] lg:text-xs font-bold rounded-lg transition-all ${
                    activeTab === tab.id 
                      ? 'bg-brand-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-accent-red/10 border border-accent-red/20 text-accent-red text-xs rounded-xl flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-red animate-ping shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Quick Sandbox Tab */}
            {activeTab === 'demo' && (
              <div className="space-y-4 text-left">
                <p className="text-xs text-slate-400 leading-normal">
                  Launch a workspace immediately with a preconfigured AI roadmap and sandbox databases. No authentication required.
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Your Name</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="e.g. Priyadharshini"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-surface-900/50 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Career Aim</label>
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
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Exp. Level</label>
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
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Optional 2nd Goal</label>
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

                <button
                  onClick={handleDemoAccess}
                  disabled={loading}
                  className="w-full btn-primary h-11 flex items-center justify-center gap-2 mt-2 disabled:opacity-50 text-xs"
                >
                  {loading ? 'Setting up Sandbox...' : 'Launch Live Demo Sandbox'} <ArrowRight size={14} />
                </button>
              </div>
            )}

            {/* Login Tab */}
            {activeTab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Username</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Enter username"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      className="w-full bg-surface-900/50 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="password"
                      placeholder="Enter password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full bg-surface-900/50 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary h-11 flex items-center justify-center gap-2 mt-4 disabled:opacity-50 text-xs"
                >
                  {loading ? 'Authenticating...' : 'Sign In to Workspace'} <ArrowRight size={14} />
                </button>
              </form>
            )}

            {/* Signup Tab */}
            {activeTab === 'signup' && (
              <form onSubmit={handleSignup} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Your Name</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="e.g. Priyadharshini"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-surface-900/50 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Username</label>
                    <input
                      type="text"
                      placeholder="Choose a username"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      className="w-full bg-surface-900/50 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Password</label>
                    <input
                      type="password"
                      placeholder="Min 6 chars"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full bg-surface-900/50 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Goal</label>
                    <select
                      value={primaryGoal}
                      onChange={e => setPrimaryGoal(e.target.value)}
                      className="w-full bg-surface-900/50 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
                    >
                      <option>AI Engineer</option>
                      <option>Data Scientist</option>
                      <option>Full Stack Developer</option>
                      <option>Cybersecurity Specialist</option>
                      <option>Cloud DevOps Engineer</option>
                      <option>UI/UX Designer</option>
                      <option>Product Manager</option>
                      <option>Blockchain Engineer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Exp. Level</label>
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
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary h-11 flex items-center justify-center gap-2 mt-2 disabled:opacity-50 text-xs"
                >
                  {loading ? 'Creating Account…' : 'Register & Launch Platform'} <ArrowRight size={14} />
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Feature Grid Section */}
      <section id="features" className="py-20 px-6 lg:px-16 border-t border-white/5 bg-surface-800/30">
        <div className="max-w-7xl mx-auto space-y-12">
          
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <p className="text-xs font-bold text-brand-400 uppercase tracking-widest">Platform Core Features</p>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              An Engine Built for Long-Term Knowledge Mastery
            </h2>
            <p className="text-sm text-slate-400">
              Unlike static checklists or online courses, SkillPilot adapts in real time to your knowledge profile.
            </p>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Feature 1 */}
            <div className="glass-card p-6 flex flex-col gap-4 text-left hover:border-white/10 hover:bg-surface-800/60 transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
                <Dna className="text-brand-400" size={18} />
              </div>
              <h3 className="text-lg font-bold text-white">Learner Digital Twin</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                A structured knowledge map that estimates your true mastery across nested skills. Updates with every resource you finish and test you take.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-card p-6 flex flex-col gap-4 text-left hover:border-white/10 hover:bg-surface-800/60 transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center shrink-0">
                <Compass className="text-accent-purple" size={18} />
              </div>
              <h3 className="text-lg font-bold text-white">Adaptive Learning Path</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Dynamic roadmap branching. If you fail a quiz, the system automatically redirects you to foundational modules and updates locked dependencies.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-card p-6 flex flex-col gap-4 text-left hover:border-white/10 hover:bg-surface-800/60 transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-accent-green/10 border border-accent-green/20 flex items-center justify-center shrink-0">
                <Brain className="text-accent-green" size={18} />
              </div>
              <h3 className="text-lg font-bold text-white">BKT Quiz Calibration</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Bayesian Knowledge Tracing assesses your performance combined with confidence tracking to flag overconfidence and mismatch patterns.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="glass-card p-6 flex flex-col gap-4 text-left hover:border-white/10 hover:bg-surface-800/60 transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-accent-yellow/10 border border-accent-yellow/20 flex items-center justify-center shrink-0">
                <Calendar className="text-accent-yellow" size={18} />
              </div>
              <h3 className="text-lg font-bold text-white">Spaced Repetition Decay</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Using SM-2 intervals, the system predicts when memory decay is setting in and populates a Spaced Repetition queue to refresh key skills.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="glass-card p-6 flex flex-col gap-4 text-left hover:border-white/10 hover:bg-surface-800/60 transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center shrink-0">
                <LineChart className="text-accent-blue" size={18} />
              </div>
              <h3 className="text-lg font-bold text-white">What-If Time Simulator</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Predict graduation dates and timeline delta impact. Toggle skills to skip or adjust weekly learning hours to plan study schedules.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="glass-card p-6 flex flex-col gap-4 text-left hover:border-white/10 hover:bg-surface-800/60 transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center shrink-0">
                <MessageSquare className="text-pink-400" size={18} />
              </div>
              <h3 className="text-lg font-bold text-white">Context-Aware AI Copilot</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                An LLM assistant seeded with your complete learning path, gaps, and schedule. It answers questions and provides direct roadmap buttons.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 text-center text-xs text-slate-500 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-brand-500" />
            <span className="font-semibold text-slate-400">SkillPilot AI</span>
          </div>
          <div>
            <span>© {new Date().getFullYear()} SkillPilot AI. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

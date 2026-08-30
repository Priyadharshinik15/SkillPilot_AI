/**
 * LearnerContext
 * ─────────────────────────────────────────────────────────────────────────
 * Tries the real FastAPI backend first.
 * If the backend is unreachable (network error / ECONNREFUSED),
 * falls back to full local logic with localStorage persistence.
 * This means the UI always works even if `uvicorn` isn't running.
 */
import React, { createContext, useContext, useState, useCallback } from 'react'
import axios from 'axios'

const LearnerContext = createContext(null)
const TOKEN_KEY      = 'skillpilot_token'
const USERS_KEY      = 'skillpilot_users'

// ── helpers ────────────────────────────────────────────────────────────────
function getToken()    { try { return sessionStorage.getItem(TOKEN_KEY) || null } catch { return null } }
function saveToken(t)  { try { t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY) } catch {} }
function loadUsers()   { try { return JSON.parse(localStorage.getItem(USERS_KEY) || '{}') } catch { return {} } }
function saveUsers(u)  { try { localStorage.setItem(USERS_KEY, JSON.stringify(u)) } catch {} }

// Axios instance pointing at FastAPI
const api = axios.create({ baseURL: 'http://localhost:8000', timeout: 4000 })
api.interceptors.request.use(cfg => {
  const t = getToken()
  if (t) cfg.headers['Authorization'] = `Bearer ${t}`
  return cfg
})

// ── BKT (mirrors backend logic exactly) ───────────────────────────────────
function bktUpdate(selfReported, answers) {
  const pSlip = 0.1, pGuess = 0.2, pLearn = 0.3
  let p = selfReported
  for (const correct of answers) {
    const num = correct ? p * (1 - pSlip)    : p * pSlip
    const den = correct ? num + (1 - p) * pGuess : num + (1 - p) * (1 - pGuess)
    const posterior = den > 0 ? num / den : p
    // no learning bump on assessment (pure BKT)
    p = posterior
  }
  return Math.round(Math.min(Math.max(p, 0), 0.99) * 100) / 100
}

// ── readiness ──────────────────────────────────────────────────────────────
function computeReadiness(skills) {
  if (!skills.length) return 0
  const ratios = skills.map(s => Math.min(s.mastery / s.required, 1))
  return Math.round((ratios.reduce((a, b) => a + b, 0) / ratios.length) * 100)
}

// ── local user store ───────────────────────────────────────────────────────
function hashPw(pw) {
  let h = 0
  for (let i = 0; i < pw.length; i++) { h = (Math.imul(31, h) + pw.charCodeAt(i)) | 0 }
  return String(h)
}

const GOAL_SKILLS = {
  'AI Engineer':            ['Python','NumPy','Pandas','Statistics','Machine Learning','Feature Engineering','Deep Learning','PyTorch','NLP','LLM','RAG','Docker','MLOps'],
  'Data Scientist':         ['Python','NumPy','Pandas','Statistics','SQL','Data Visualization','Machine Learning','Feature Engineering'],
  'Full Stack Developer':   ['HTML','CSS','JavaScript','React','Node.js','REST APIs','Databases','Python'],
  'Cybersecurity Specialist':['Cryptography','Network Security','Application Security','Cloud Security','Ethical Hacking','SOC','Penetration Testing','Security Engineering'],
  'Cloud DevOps Engineer':  ['Python','Docker','Kubernetes','AWS','CI/CD','Terraform','DevOps','Cloud Architecture'],
  'UI/UX Designer':         ['User Research','Wireframing','Figma','UI/UX Design','Product Design','Design Systems'],
  'Product Manager':        ['Product Management','Project Management','Business Strategy','Agile/Scrum','User Research'],
  'Blockchain Engineer':    ['Cryptography','Blockchain','Web3','Solidity','Smart Contracts'],
}
const REQUIRED_LEVELS = {
  'AI Engineer':            [0.8,0.6,0.6,0.7,0.8,0.6,0.7,0.6,0.6,0.6,0.5,0.5,0.5],
  'Data Scientist':         [0.7,0.7,0.8,0.8,0.7,0.7,0.7,0.6],
  'Full Stack Developer':   [0.8,0.8,0.8,0.7,0.7,0.7,0.6,0.4],
  'Cybersecurity Specialist':[0.6,0.8,0.7,0.7,0.8,0.6,0.8,0.7],
  'Cloud DevOps Engineer':  [0.5,0.8,0.8,0.8,0.8,0.7,0.8,0.6],
  'UI/UX Designer':         [0.8,0.8,0.8,0.9,0.7,0.7],
  'Product Manager':        [0.9,0.7,0.8,0.8,0.6],
  'Blockchain Engineer':    [0.7,0.9,0.8,0.8,0.8],
}
const PROJECTS = {
  'AI Engineer': [
    {id:'p1',title:'Customer Churn Prediction',skills:['Machine Learning','Pandas','Feature Engineering'],difficulty:'Intermediate',hours:6,reason:'Strengthens your weakest ML skills',recommended:true},
    {id:'p2',title:'RAG Document Assistant',skills:['LLM','RAG','Python'],difficulty:'Advanced',hours:10,reason:'Prepares for Generative AI phase',recommended:false},
    {id:'p3',title:'ML Model Deployment API',skills:['FastAPI','Docker','MLOps'],difficulty:'Intermediate',hours:8,reason:'Covers MLOps gap',recommended:false},
  ],
  'Data Scientist': [
    {id:'p4',title:'EDA & Visualization Dashboard',skills:['Pandas','Data Visualization','Statistics'],difficulty:'Beginner',hours:4,reason:'Builds core data science workflow',recommended:true},
    {id:'p5',title:'Predictive Analytics Pipeline',skills:['Machine Learning','SQL','Feature Engineering'],difficulty:'Intermediate',hours:8,reason:'End-to-end ML project',recommended:false},
  ],
  'Full Stack Developer': [
    {id:'p6',title:'Full Stack Todo App',skills:['React','Node.js','Databases'],difficulty:'Intermediate',hours:6,reason:'Covers the full stack in one project',recommended:true},
    {id:'p7',title:'REST API with Auth',skills:['REST APIs','Node.js','Databases'],difficulty:'Intermediate',hours:5,reason:'Core backend skill',recommended:false},
  ],
}

function buildLocalLearner(username, name, goal, experience) {
  const skillNames  = GOAL_SKILLS[goal]    || GOAL_SKILLS['AI Engineer']
  const reqLevels   = REQUIRED_LEVELS[goal] || REQUIRED_LEVELS['AI Engineer']
  const base        = { beginner: 0.2, intermediate: 0.4, advanced: 0.65 }[experience] || 0.3

  const skills = skillNames.map((name, i) => ({
    name,
    mastery:       Math.round((base + (Math.random() * 0.12 - 0.06)) * 100) / 100,
    required:      reqLevels[i] ?? 0.7,
    lastPracticed: Math.floor(Math.random() * 20),
  }))

  const readiness = computeReadiness(skills)
  const gaps      = skills.filter(s => s.required > s.mastery).sort((a,b)=>(b.required-b.mastery)-(a.required-a.mastery))
  const nextSkill = gaps[0]

  const topo      = skillNames.slice()
  const chunkSize = Math.ceil(topo.length / 4)
  const chunks    = [topo.slice(0,chunkSize), topo.slice(chunkSize,chunkSize*2), topo.slice(chunkSize*2,chunkSize*3), topo.slice(chunkSize*3)]
  const PHASE_LABELS = ['Foundation','Core Skills','Advanced','Expert']
  const roadmap = chunks.filter(c=>c.length).map((chunk, i) => {
    const statuses = chunk.map(s => { const sk = skills.find(x=>x.name===s); return sk ? sk.mastery/sk.required : 0 })
    const prog = Math.round(statuses.reduce((a,b)=>a+b,0)/statuses.length*100)
    const status = i === 0 ? 'in_progress' : (chunks[i-1].every(s=>{ const sk=skills.find(x=>x.name===s); return sk&&sk.mastery/sk.required>=0.6 }) ? 'in_progress' : 'locked')
    return { id:i+1, phase:`0${i+1}`, title:PHASE_LABELS[i]||`Phase ${i+1}`, skills:chunk, progress:prog, status, assessmentRequired:prog>0&&prog<80, lockReason:status==='locked'?`Complete Phase ${i} first`:null }
  })

  return {
    name, goal, experience,
    readiness, readinessDelta: 0,
    skills, roadmap,
    weeklyStats:     { skillsImproved:0, lessonsCompleted:0, projectsDone:0, hoursLearned:0 },
    evidenceOfMastery: { course:Math.min(100,Math.round(readiness*1.2)), quiz:Math.min(100,Math.round(readiness*0.9)), coding:Math.min(100,Math.round(readiness*0.8)), project:Math.min(100,Math.round(readiness)) },
    decayAlerts:     skills.filter(s=>s.lastPracticed>14).slice(0,3).map(s=>({ skill:s.name, daysSince:s.lastPracticed, retention:Math.max(20,100-s.lastPracticed*2) })),
    falseMastery:    [],
    nextAction: {
      type:'assessment',
      title: nextSkill ? `${nextSkill.name} Assessment` : 'Take a Quiz',
      duration:'15-20 min',
      reason: nextSkill ? `Your ${nextSkill.name} mastery is ${Math.round(nextSkill.mastery*100)}% — improving it will unlock the next phase.` : 'Complete an assessment to calibrate your profile.',
      skill:  nextSkill?.name ?? null,
      targetMastery: nextSkill?.required ?? 0.7,
    },
    adaptationHistory: [],
    projects: PROJECTS[goal] || PROJECTS['AI Engineer'],
    chatHistory: [{ role:'assistant', content:`Hi ${name}! I'm your Learning Copilot. I know your full ${goal} profile and roadmap. Ask me anything.` }],
    whatIfResult: null,
  }
}

// ── local responses for chat ───────────────────────────────────────────────
function localChat(message, learner) {
  const msg = message.toLowerCase()
  const goal = learner?.goal || 'your goal'
  const gaps = (learner?.skills||[]).filter(s=>s.required>s.mastery).sort((a,b)=>(b.required-b.mastery)-(a.required-a.mastery))

  if (/deep learning|lock|block|unlock|can.t start/.test(msg)) {
    const ml = learner?.skills?.find(s=>s.name==='Machine Learning')
    return { reply:`Your Deep Learning module is currently locked because your Machine Learning mastery is ${Math.round((ml?.mastery||0)*100)}%.\n\nYou need ${Math.round((ml?.required||0.8)*100)}% to unlock it.\n\nI recommend taking the Machine Learning assessment.`, action:{label:'Take Assessment',path:'/assess'} }
  }
  if (/ready|readiness|progress|how am i/.test(msg)) {
    const top3 = gaps.slice(0,3).map(s=>`  • ${s.name} — gap: ${Math.round((s.required-s.mastery)*100)}%`).join('\n') || '  All skills on track!'
    return { reply:`Your career readiness for **${goal}** is **${learner?.readiness??0}%**.\n\nTop bottlenecks:\n${top3}`, action:{label:'View Roadmap',path:'/roadmap'} }
  }
  if (/next|what should|do now|recommend/.test(msg)) {
    const na = learner?.nextAction||{}
    return { reply:`⚡ **${na.title||'Take a quiz'}** (${na.duration||'~15 min'})\n\n${na.reason||''}`, action:{label:'Start Now',path:'/next-action'} }
  }
  if (/decay|forget|retention|review/.test(msg)) {
    const alerts = learner?.decayAlerts||[]
    const lines  = alerts.map(a=>`  • ${a.skill} — ${a.daysSince} days, retention ${a.retention}%`).join('\n') || '  No decay detected.'
    return { reply:`Knowledge decay status:\n\n${lines}`, action:{label:'View Twin',path:'/twin'} }
  }
  return { reply:`I'm your Learning Copilot for **${goal}**.\n\nTry:\n• "Why can't I start Deep Learning?"\n• "What should I do right now?"\n• "Which skills are decaying?"\n• "Show my roadmap"`, action:null }
}

// ══════════════════════════════════════════════════════════════════════════
export function LearnerProvider({ children }) {
  const [learner, setLearner]        = useState(null)
  const [isAuthenticated, setIsAuth] = useState(false)
  const [loading, setLoading]        = useState(false)
  const [goalInput, setGoalInput]    = useState('')
  const [isAnalyzing, setIsAnalyzing]= useState(false)
  const [backendUp, setBackendUp]    = useState(true)

  // ── session restore ────────────────────────────────────────────────────
  React.useEffect(() => {
    const token = getToken()
    if (!token) return
    setLoading(true)
    api.get('/api/me')
      .then(r => { setLearner(r.data); setIsAuth(true); setBackendUp(true) })
      .catch(() => {
        setBackendUp(false)
        // try local restore
        const users = loadUsers()
        const user  = users[token]
        if (user?.learnerData) { setLearner(user.learnerData); setIsAuth(true) }
        else { saveToken(null) }
      })
      .finally(() => setLoading(false))
  }, [])

  // ── register ───────────────────────────────────────────────────────────
  const register = useCallback(async (username, password, name, goalText, experience, secondGoal) => {
    setLoading(true)
    const key = username.toLowerCase().trim()

    // Try backend first
    try {
      const { data } = await api.post('/api/register', { username:key, password, name, goal_text:goalText, experience, second_goal:secondGoal!=='None'?secondGoal:null })
      saveToken(data.token)
      setLearner(data.learner)
      setIsAuth(true)
      setBackendUp(true)
      setLoading(false)
      return { success: true }
    } catch (err) {
      // network error → offline mode
      if (!err.response) {
        setBackendUp(false)
        const users = loadUsers()
        if (users[key]) { setLoading(false); return { success:false, error:'Username already taken.' } }

        const goalMap = { 'ai engineer':'AI Engineer','ml engineer':'AI Engineer','data scien':'Data Scientist','full stack':'Full Stack Developer','cybersec':'Cybersecurity Specialist','cloud':'Cloud DevOps Engineer','devops':'Cloud DevOps Engineer','ui':'UI/UX Designer','ux':'UI/UX Designer','product':'Product Manager','blockchain':'Blockchain Engineer' }
        let detectedGoal = 'AI Engineer'
        const lower = goalText.toLowerCase()
        for (const [k,v] of Object.entries(goalMap)) { if (lower.includes(k)) { detectedGoal=v; break } }

        const newLearner = buildLocalLearner(key, name, detectedGoal, experience)
        users[key] = { pw: hashPw(password), name, learnerData: newLearner }
        saveUsers(users)
        saveToken(key)
        setLearner(newLearner)
        setIsAuth(true)
        setLoading(false)
        return { success: true }
      }
      // server error (e.g. 409 conflict)
      const msg = err.response?.data?.detail || 'Registration failed.'
      setLoading(false)
      return { success:false, error:msg }
    }
  }, [])

  // ── login ──────────────────────────────────────────────────────────────
  const login = useCallback(async (username, password) => {
    setLoading(true)
    const key = username.toLowerCase().trim()

    try {
      const { data } = await api.post('/api/login', { username:key, password })
      saveToken(data.token)
      setLearner(data.learner)
      setIsAuth(true)
      setBackendUp(true)
      setLoading(false)
      return { success: true }
    } catch (err) {
      if (!err.response) {
        setBackendUp(false)
        const users = loadUsers()
        const user  = users[key]
        if (!user)                      { setLoading(false); return { success:false, error:'Username not found.' } }
        if (user.pw !== hashPw(password)){ setLoading(false); return { success:false, error:'Incorrect password.' } }
        const data = user.learnerData || buildLocalLearner(key, user.name, 'AI Engineer', 'intermediate')
        saveToken(key)
        setLearner(data)
        setIsAuth(true)
        setLoading(false)
        return { success: true }
      }
      const msg = err.response?.data?.detail || 'Login failed.'
      setLoading(false)
      return { success:false, error:msg }
    }
  }, [])

  // ── logout ─────────────────────────────────────────────────────────────
  const logout = useCallback(() => { saveToken(null); setLearner(null); setIsAuth(false) }, [])

  // ── analyzeGoal ────────────────────────────────────────────────────────
  const analyzeGoal = useCallback(async (text) => {
    setIsAnalyzing(true)
    try {
      const { data } = await api.post('/api/analyze-goal', { text })
      setLearner(data); return { success:true }
    } catch { return { success:false, error:'Analysis failed.' } }
    finally { setIsAnalyzing(false) }
  }, [])

  // ── submitQuiz ─────────────────────────────────────────────────────────
  const submitQuiz = useCallback(async (skill, answersCorrect, confidence) => {
    if (backendUp) {
      try {
        const { data } = await api.post('/api/quiz/submit', { skill, answers_correct:answersCorrect, confidence })
        if (data.learner) setLearner(data.learner)
        return data
      } catch (err) { if (err.response) throw err }
    }

    // local BKT fallback
    return new Promise(resolve => {
      setLearner(prev => {
        const skillObj     = prev.skills.find(s=>s.name===skill)
        const selfReported = skillObj?.mastery ?? 0.5
        const demonstrated = bktUpdate(selfReported, answersCorrect)
        const score        = answersCorrect.filter(Boolean).length / answersCorrect.length
        const gap          = selfReported - demonstrated

        const updatedSkills = prev.skills.map(s => s.name===skill ? {...s, mastery:demonstrated} : s)
        const shouldAdapt   = score < 0.6 && gap >= 0.15

        const adaptation = shouldAdapt ? {
          trigger:`${skill} quiz — score ${Math.round(score*100)}%`,
          before:[skill,'Next Phase'],
          after:[`${skill} Revision`,`${skill} Reassessment`,'Next Phase'],
          reason:`Your demonstrated ${skill} score (${Math.round(demonstrated*100)}%) was below the threshold. A corrective revision block has been added.`,
        } : null

        resolve({
          skill, self_reported:selfReported, demonstrated,
          score:`${answersCorrect.filter(Boolean).length}/${answersCorrect.length}`,
          mismatch:{ flagged:gap>=0.25, gap:Math.round(gap*100) },
          calib:{ dunning_kruger_flag:confidence>=4&&score<0.5, recommendation:'Consider a targeted practice session.' },
          adapted:shouldAdapt,
        })

        const next = { ...prev, skills:updatedSkills, readiness:computeReadiness(updatedSkills), adaptationHistory:adaptation?[...prev.adaptationHistory,adaptation]:prev.adaptationHistory }
        // persist locally
        const token = getToken()
        if (token) { const users=loadUsers(); if(users[token]){users[token].learnerData=next; saveUsers(users)} }
        return next
      })
    })
  }, [backendUp])

  // ── runWhatIf ──────────────────────────────────────────────────────────
  const runWhatIf = useCallback(async (candidateSkills) => {
    if (backendUp) {
      try {
        const { data } = await api.post('/api/whatif', { candidate_skills:candidateSkills })
        setLearner(prev=>({...prev, whatIfResult:data.projections}))
        return data.projections
      } catch (err) { if (err.response) throw err }
    }

    // local simulation
    const baseline = learner?.readiness ?? 0
    const required = Object.fromEntries((learner?.skills||[]).map(s=>[s.name,s.required]))
    const current  = Object.fromEntries((learner?.skills||[]).map(s=>[s.name,s.mastery]))

    const projections = candidateSkills.map(skill => {
      const hypo = {...current, [skill]:1.0}
      const ratios = Object.entries(required).map(([s,r])=>Math.min((hypo[s]??0)/r,1))
      const projected = Math.round(ratios.reduce((a,b)=>a+b,0)/ratios.length*100)
      return { skill, current_readiness:baseline, projected_readiness:projected, delta:projected-baseline }
    }).sort((a,b)=>b.delta-a.delta)

    setLearner(prev=>({...prev, whatIfResult:projections}))
    return projections
  }, [backendUp, learner])

  // ── sendChat ───────────────────────────────────────────────────────────
  const sendChat = useCallback(async (message) => {
    setLearner(prev=>({...prev, chatHistory:[...(prev?.chatHistory||[]),{role:'user',content:message}]}))

    if (backendUp) {
      try {
        const { data } = await api.post('/api/chat', { message })
        setLearner(prev=>({...prev, chatHistory:[...(prev?.chatHistory||[]),{role:'assistant',content:data.reply,action:data.action}]}))
        return data
      } catch (err) { if (err.response) throw err }
    }

    // local fallback
    await new Promise(r=>setTimeout(r,600))
    const { reply, action } = localChat(message, learner)
    setLearner(prev=>({...prev, chatHistory:[...(prev?.chatHistory||[]),{role:'assistant',content:reply,action}]}))
    return { reply, action }
  }, [backendUp, learner])

  // ── completeProject ────────────────────────────────────────────────────
  const completeProject = useCallback(async (projectId) => {
    if (backendUp) {
      try { await api.post('/api/projects/complete',{project_id:projectId}); const {data}=await api.get('/api/me'); setLearner(data); return } catch(err){if(err.response)throw err}
    }
    setLearner(prev=>{
      const next={...prev, weeklyStats:{...prev.weeklyStats, projectsDone:(prev.weeklyStats.projectsDone||0)+1}}
      const token=getToken(); if(token){const users=loadUsers();if(users[token]){users[token].learnerData=next;saveUsers(users)}}
      return next
    })
  }, [backendUp])

  // ── updateMastery (local) ──────────────────────────────────────────────
  const updateMastery = useCallback((skill, newMastery) => {
    setLearner(prev=>({...prev, skills:prev.skills.map(s=>s.name===skill?{...s,mastery:newMastery}:s)}))
  }, [])

  // ── refresh ────────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    try { const {data}=await api.get('/api/me'); setLearner(data) } catch {}
  }, [])

  return (
    <LearnerContext.Provider value={{
      learner, setLearner,
      isAuthenticated, loading,
      login, register, logout,
      goalInput, setGoalInput,
      isAnalyzing, analyzeGoal,
      submitQuiz, runWhatIf, sendChat,
      completeProject, updateMastery, refresh,
      backendUp, api,
    }}>
      {children}
    </LearnerContext.Provider>
  )
}

export const useLearner = () => {
  const ctx = useContext(LearnerContext)
  if (!ctx) throw new Error('useLearner must be used inside LearnerProvider')
  return ctx
}

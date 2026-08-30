import React, { useState, useRef, useEffect } from 'react'
import { Send, MessageSquare, ArrowRight, Loader } from 'lucide-react'
import { useLearner } from '../store/LearnerContext'
import { useNavigate } from 'react-router-dom'

const SUGGESTIONS = [
  "Why can't I start Deep Learning?",
  "What should I do right now?",
  "Which skills are decaying?",
  "Show me my roadmap",
  "How's my progress?",
]

export default function AICopilot() {
  const { learner, sendChat } = useLearner()
  const navigate   = useNavigate()
  const [input, setInput]       = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const bottomRef  = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [learner?.chatHistory, isTyping])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isTyping) return
    setInput('')
    setIsTyping(true)
    try {
      await sendChat(text)
    } catch {
      // ignore network errors — the optimistic message is already in state
    } finally {
      setIsTyping(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const chatHistory = learner?.chatHistory || []

  return (
    <div className="flex flex-col fade-up" style={{ height: 'calc(100vh - 56px)' }}>

      {/* Context banner */}
      <div className="px-6 pt-4 pb-2">
        <div className="glass-card p-3 flex items-center gap-2 border-brand-500/20">
          <div className="w-2 h-2 rounded-full bg-accent-green glow-dot" />
          <p className="text-xs text-slate-400">
            Copilot has full context of your profile —{' '}
            <span className="text-white font-semibold">{learner?.readiness ?? 0}%</span> readiness,{' '}
            <span className="text-white font-semibold">{learner?.skills?.length ?? 0}</span> skills tracked
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-3 space-y-4">
        {chatHistory.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-brand-600/30 border border-brand-500/30 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                <MessageSquare size={12} className="text-brand-400" />
              </div>
            )}
            <div className={`max-w-sm lg:max-w-lg`}>
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                msg.role === 'user'
                  ? 'bg-brand-600 text-white rounded-br-sm'
                  : 'glass-card text-slate-300 rounded-bl-sm'
              }`}>
                {msg.content}
              </div>
              {msg.action && (
                <button
                  onClick={() => navigate(msg.action.path)}
                  className="mt-2 flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors"
                >
                  {msg.action.label} <ArrowRight size={11} />
                </button>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-brand-600/30 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
              <MessageSquare size={12} className="text-brand-400" />
            </div>
            <div className="glass-card px-4 py-3 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1.5 items-center h-4">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      <div className="px-6 pb-2 flex gap-2 flex-wrap">
        {SUGGESTIONS.map(s => (
          <button
            key={s}
            onClick={() => setInput(s)}
            className="text-xs px-3 py-1.5 rounded-full bg-surface-700/60 border border-white/5 text-slate-400 hover:text-white hover:border-white/15 transition-all"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-6 pb-6">
        <div className="glass-card p-2 flex items-end gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask your Copilot anything about your learning journey…"
            rows={1}
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 resize-none focus:outline-none px-2 py-2 min-h-[36px] max-h-32"
            style={{ scrollbarWidth: 'none' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="p-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0 shadow-glow"
          >
            {isTyping ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  )
}

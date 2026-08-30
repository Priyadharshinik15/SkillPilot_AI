import React, { useState, useEffect } from 'react'
import { CheckCircle, XCircle, ArrowRight, RotateCcw, AlertTriangle, Brain, Zap, Loader } from 'lucide-react'
import { useLearner } from '../store/LearnerContext'
import { useNavigate } from 'react-router-dom'

// ── Fallback quiz bank (used only if backend is unreachable) ─────────────
const FALLBACK_QUIZ_BANK = {
  'Machine Learning': [
    {
      q: 'What does the bias-variance tradeoff describe?',
      options: [
        'The tradeoff between model complexity and generalization',
        'The tradeoff between training speed and accuracy',
        'The ratio of false positives to false negatives',
        'The balance between supervised and unsupervised learning',
      ],
      correct: 0,
    },
    {
      q: 'Which algorithm is ensemble-based?',
      options: ['Linear Regression', 'Random Forest', 'K-Means', 'PCA'],
      correct: 1,
    },
    {
      q: 'What metric is best for imbalanced classification?',
      options: ['Accuracy', 'Mean Squared Error', 'F1 Score', 'R-squared'],
      correct: 2,
    },
    {
      q: 'What does regularization do?',
      options: [
        'Speeds up gradient descent',
        'Penalizes large weights to reduce overfitting',
        'Normalizes the dataset',
        'Increases model depth',
      ],
      correct: 1,
    },
    {
      q: 'What is cross-validation used for?',
      options: [
        'Visualizing model weights',
        'Estimating model performance on unseen data',
        'Cleaning missing values',
        'Dimensionality reduction',
      ],
      correct: 1,
    },
  ],
  'Statistics': [
    {
      q: 'What does the p-value represent?',
      options: [
        'Probability the null hypothesis is true',
        'Probability of observing results at least as extreme if H0 is true',
        'Confidence interval width',
        'Effect size',
      ],
      correct: 1,
    },
    {
      q: 'What is the Central Limit Theorem?',
      options: [
        'All data is normally distributed',
        'Sample means approach normal distribution as sample size increases',
        'Variance equals standard deviation squared',
        'Outliers follow a Poisson distribution',
      ],
      correct: 1,
    },
    {
      q: 'Which measure is most resistant to outliers?',
      options: ['Mean', 'Variance', 'Median', 'Standard Deviation'],
      correct: 2,
    },
    {
      q: 'What does a confidence interval represent?',
      options: [
        'The exact value of the population parameter',
        'A range likely to contain the true parameter with a given probability',
        'The p-value threshold',
        'The sample size needed',
      ],
      correct: 1,
    },
  ],
  'Python': [
    {
      q: 'What is a list comprehension in Python?',
      options: [
        'A way to create functions inline',
        'A concise way to create lists using a single line expression',
        'A method to sort lists',
        'A type of loop that only works on lists',
      ],
      correct: 1,
    },
    {
      q: 'What does the `*args` parameter allow?',
      options: [
        'Keyword arguments only',
        'A fixed number of arguments',
        'A variable number of positional arguments',
        'Default argument values',
      ],
      correct: 2,
    },
    {
      q: 'What is a decorator in Python?',
      options: [
        'A class that inherits from another class',
        'A function that modifies another function',
        'A way to define constants',
        'A type of list',
      ],
      correct: 1,
    },
  ],
  'Deep Learning': [
    {
      q: 'What problem does the vanishing gradient address?',
      options: [
        'Overfitting in deep networks',
        'Gradients becoming very small in early layers during backpropagation',
        'Slow inference speed',
        'Data imbalance',
      ],
      correct: 1,
    },
    {
      q: 'What does a dropout layer do during training?',
      options: [
        'Removes neurons with low activation',
        'Randomly sets a fraction of input units to zero to prevent overfitting',
        'Normalizes activations across batches',
        'Reduces the learning rate',
      ],
      correct: 1,
    },
    {
      q: 'Which activation function is most commonly used in hidden layers of deep networks?',
      options: ['Sigmoid', 'Tanh', 'ReLU', 'Softmax'],
      correct: 2,
    },
  ],
}

const AVAILABLE_SKILLS = Object.keys(FALLBACK_QUIZ_BANK)

export default function Assessments() {
  const { learner, submitQuiz, api } = useLearner()
  const navigate = useNavigate()
  const [availableSkills, setAvailableSkills]   = useState(AVAILABLE_SKILLS)
  const [selectedSkill, setSelectedSkill]       = useState('Machine Learning')
  const [questions, setQuestions]               = useState([])
  const [loadingQ, setLoadingQ]                 = useState(false)
  const [answers, setAnswers]                   = useState({})
  const [confidence, setConfidence]             = useState(3)
  const [isSubmitting, setIsSubmitting]         = useState(false)
  const [submitted, setSubmitted]               = useState(false)
  const [quizResult, setQuizResult]             = useState(null)

  // Fetch available quiz skills from backend
  useEffect(() => {
    api.get('/api/quiz/skills')
      .then(r => { setAvailableSkills(r.data.skills); setSelectedSkill(r.data.skills[0] || 'Machine Learning') })
      .catch(() => {})
  }, [api])

  // Fetch questions for selected skill from backend
  useEffect(() => {
    setLoadingQ(true)
    setAnswers({})
    setSubmitted(false)
    setQuizResult(null)
    api.get(`/api/quiz?skill=${encodeURIComponent(selectedSkill)}`)
      .then(r => setQuestions(r.data))
      .catch(() => setQuestions(FALLBACK_QUIZ_BANK[selectedSkill] || []))
      .finally(() => setLoadingQ(false))
  }, [selectedSkill, api])

  const currentSkill = learner?.skills?.find(s => s.name === selectedSkill)
  const allAnswered   = questions.length > 0 && Object.keys(answers).length === questions.length

  const handleAnswer = (qIdx, optIdx) => {
    if (submitted) return
    setAnswers(prev => ({ ...prev, [qIdx]: optIdx }))
  }

  const handleSubmit = async () => {
    if (!allAnswered) return
    const answersCorrect = questions.map((q, i) => answers[i] === q.correct)
    setIsSubmitting(true)
    const result = await submitQuiz(selectedSkill, answersCorrect, confidence)
    setQuizResult(result)
    setSubmitted(true)
    setIsSubmitting(false)
  }

  const handleReset = () => {
    setAnswers({})
    setSubmitted(false)
    setQuizResult(null)
  }

  const correctCount = submitted
    ? questions.filter((q, i) => answers[i] === q.correct).length
    : 0

  return (
    <div className="p-6 fade-up">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Skill selector */}
        <div className="glass-card p-4">
          <p className="section-title mb-3">Select skill to assess</p>
          <div className="flex gap-2 flex-wrap">
            {availableSkills.map(skill => (
              <button
                key={skill}
                onClick={() => setSelectedSkill(skill)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedSkill === skill
                    ? 'bg-brand-600 text-white shadow-glow'
                    : 'bg-surface-700/60 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                {skill}
              </button>
            ))}
          </div>
        </div>

        {/* Current mastery card */}
        {currentSkill && (
          <div className="glass-card p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 mb-1">Current mastery — {selectedSkill}</p>
              <p className="text-3xl font-black text-white font-mono">
                {Math.round(currentSkill.mastery * 100)}%
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 mb-1">Target</p>
              <p className="text-3xl font-black text-brand-400 font-mono">
                {Math.round(currentSkill.required * 100)}%
              </p>
            </div>
            <div className="flex-1 mx-6">
              <div className="h-2 bg-surface-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-600 to-accent-green rounded-full skill-bar-fill"
                  style={{ width: `${currentSkill.mastery * 100}%` }}
                />
              </div>
              <div
                className="mt-0.5 h-0.5 bg-brand-500/40"
                style={{ marginLeft: `${currentSkill.required * 100}%`, width: '2px' }}
              />
            </div>
          </div>
        )}

        {/* Quiz questions */}
        {loadingQ ? (
          <div className="glass-card p-8 flex items-center justify-center gap-3">
            <Loader size={18} className="text-brand-400 animate-spin" />
            <span className="text-slate-400 text-sm">Loading questions…</span>
          </div>
        ) : !submitted ? (
          <>
            {questions.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <p className="text-slate-500">No questions available for this skill yet.</p>
              </div>
            ) : (
              questions.map((q, qi) => (
                <div key={qi} className="glass-card p-5">
                  <p className="text-sm font-semibold text-white mb-3">
                    <span className="font-mono text-brand-400 mr-2">Q{qi + 1}.</span>
                    {q.q}
                  </p>
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => (
                      <button
                        key={oi}
                        onClick={() => handleAnswer(qi, oi)}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm border transition-all ${
                          answers[qi] === oi
                            ? 'border-brand-500/60 bg-brand-600/15 text-white'
                            : 'border-white/5 bg-surface-700/40 text-slate-400 hover:text-white hover:border-white/15'
                        }`}
                      >
                        <span className="font-mono text-xs text-slate-600 mr-2">
                          {String.fromCharCode(65 + oi)}.
                        </span>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}

            {/* Confidence slider */}
            {questions.length > 0 && (
              <div className="glass-card p-5">
                <p className="text-sm font-semibold text-white mb-3">
                  How confident are you overall?
                  <span className="text-slate-500 font-normal ml-2">(1 = guessing, 5 = certain)</span>
                </p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(v => (
                    <button
                      key={v}
                      onClick={() => setConfidence(v)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                        confidence === v
                          ? 'border-brand-500 bg-brand-600/20 text-white'
                          : 'border-white/5 bg-surface-700/40 text-slate-500 hover:text-white'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!allAnswered || isSubmitting}
              className="btn-primary w-full py-4 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed text-base"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analyzing…
                </>
              ) : (
                <>Submit Quiz <ArrowRight size={16} /></>
              )}
            </button>
          </>
        ) : (
          /* ── Results ── */
          <div className="space-y-5 fade-up">

            {/* Score summary */}
            <div className="glass-card p-6 text-center border-brand-500/20">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Quiz Result</p>
              <p className="text-6xl font-black text-white mb-1">
                {correctCount}
                <span className="text-slate-500 text-3xl">/{questions.length}</span>
              </p>
              <p className="text-sm text-slate-400 mb-5">correct answers</p>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-surface-700/40 rounded-xl p-3">
                  <p className="text-[10px] text-slate-500 mb-1">Before</p>
                  <p className="text-xl font-black text-accent-yellow font-mono">
                    {quizResult ? Math.round(quizResult.self_reported * 100) : '—'}%
                  </p>
                </div>
                <div className="bg-surface-700/40 rounded-xl p-3">
                  <p className="text-[10px] text-slate-500 mb-1">Score</p>
                  <p className="text-xl font-black text-white font-mono">
                    {Math.round(correctCount / questions.length * 100)}%
                  </p>
                </div>
                <div className="bg-surface-700/40 rounded-xl p-3">
                  <p className="text-[10px] text-slate-500 mb-1">After (BKT)</p>
                  <p className="text-xl font-black text-accent-green font-mono">
                    {quizResult ? Math.round(quizResult.demonstrated * 100) : '—'}%
                  </p>
                </div>
              </div>
            </div>

            {/* Mismatch / overconfidence warnings */}
            {quizResult?.mismatch?.flagged && (
              <div className="glass-card p-4 border-accent-yellow/20 flex items-start gap-3">
                <AlertTriangle size={16} className="text-accent-yellow shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white">False Mastery Detected</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Your self-reported mastery was {quizResult.mismatch.gap}% higher than what you demonstrated.
                    A revision module has been added to your roadmap.
                  </p>
                </div>
              </div>
            )}

            {quizResult?.calib?.dunning_kruger_flag && (
              <div className="glass-card p-4 border-accent-red/20 flex items-start gap-3">
                <Brain size={16} className="text-accent-red shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white">Overconfidence Pattern Detected</p>
                  <p className="text-xs text-slate-400 mt-1">{quizResult.calib.recommendation}</p>
                </div>
              </div>
            )}

            {quizResult?.adapted && (
              <div className="glass-card p-4 border-accent-green/20 flex items-start gap-3">
                <Zap size={16} className="text-accent-green shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white">Your Roadmap Has Been Adapted</p>
                  <p className="text-xs text-slate-400 mt-1">
                    The AI updated your learning path based on this assessment result.
                  </p>
                  <button
                    onClick={() => navigate('/adaptations')}
                    className="mt-2 text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
                  >
                    View changes <ArrowRight size={11} />
                  </button>
                </div>
              </div>
            )}

            {/* Answer review */}
            {questions.map((q, qi) => {
              const isCorrect = answers[qi] === q.correct
              return (
                <div
                  key={qi}
                  className={`glass-card p-4 border ${
                    isCorrect ? 'border-accent-green/20' : 'border-accent-red/20'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {isCorrect
                      ? <CheckCircle size={16} className="text-accent-green shrink-0 mt-0.5" />
                      : <XCircle    size={16} className="text-accent-red shrink-0 mt-0.5"   />
                    }
                    <div>
                      <p className="text-sm text-white font-medium">{q.q}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Your answer: <span className={isCorrect ? 'text-accent-green' : 'text-accent-red'}>
                          {q.options[answers[qi]]}
                        </span>
                      </p>
                      {!isCorrect && (
                        <p className="text-xs text-accent-green mt-0.5">
                          ✓ Correct: {q.options[q.correct]}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            <button
              onClick={handleReset}
              className="btn-ghost w-full flex items-center justify-center gap-2"
            >
              <RotateCcw size={14} /> Retake Quiz
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

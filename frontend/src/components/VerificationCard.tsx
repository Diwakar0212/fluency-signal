import { cn } from "../lib/utils"

interface Evidence {
  message: string
  classification: "Challenge" | "Verification" | "Correction"
}

interface VerificationCardProps {
  score: number
  evidence: Evidence[]
}

const SCORE_LABELS = {
  1: "Blindly Accepted",
  2: "Weak Verification",
  3: "Questioned AI",
  4: "Actively Verified"
}

const SCORE_DESCRIPTIONS = {
  1: "Accepted AI responses without any questions.",
  2: "Asked brief clarifications but did not challenge claims.",
  3: "Questioned the AI's claims or asked for verification.",
  4: "Actively verified, provided evidence, or corrected the AI with facts."
}

export function VerificationCard({ score, evidence }: VerificationCardProps) {
  // SVG arc calculation for the gauge
  const radius = 60
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - ((score / 4) * 0.75 * circumference) // 0.75 makes it a 270 degree arc

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-md overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-800 p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-100">3. Verification Behavior (Critical Friction)</h3>
            <p className="text-sm text-slate-400 mt-1">Measures how critically you evaluated and verified the AI's responses.</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-3 rounded-lg bg-amber-950 px-4 py-2 border border-amber-500/30">
            <span className="text-sm font-medium text-amber-300">Verification Behavior Score</span>
            <span className="text-2xl font-bold text-amber-100">{score}<span className="text-amber-500/50 text-lg">/4</span></span>
          </div>
          <span className="text-xs text-slate-500 pr-2">You {SCORE_LABELS[score as keyof typeof SCORE_LABELS].toLowerCase()}</span>
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
        
        {/* Left Side: Score Gauge */}
        <div className="p-6">
          <h4 className="text-lg font-medium text-slate-200 mb-6">Your Score</h4>
          
          <div className="flex flex-col md:flex-row items-center gap-8 mb-8">
            <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
              {/* Background Arc */}
              <svg className="w-full h-full transform -rotate-135" viewBox="0 0 140 140">
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  className="text-slate-800"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * 0.25}
                  strokeLinecap="round"
                />
                {/* Foreground Arc */}
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  className="text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)] transition-all duration-1000 ease-out"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center mt-2">
                <span className="text-4xl font-bold text-slate-100">{score}</span>
                <span className="text-sm text-slate-500">/ 4</span>
              </div>
            </div>
            
            <div>
              <h5 className="text-xl font-bold text-amber-400 mb-2">{SCORE_LABELS[score as keyof typeof SCORE_LABELS]}</h5>
              <p className="text-sm text-slate-300">{SCORE_DESCRIPTIONS[score as keyof typeof SCORE_DESCRIPTIONS]}</p>
            </div>
          </div>
          
          {/* Steps */}
          <div className="flex justify-between relative mt-12 px-2">
            <div className="absolute top-3 left-4 right-4 h-0.5 bg-slate-800 -z-10" />
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex flex-col items-center gap-3 w-1/4">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                  score >= step 
                    ? "bg-amber-500 text-amber-950 shadow-[0_0_10px_rgba(245,158,11,0.5)]" 
                    : "bg-slate-800 text-slate-500"
                )}>
                  {step}
                </div>
                <div className="text-center">
                  <div className={cn("text-xs font-semibold", score >= step ? "text-amber-400" : "text-slate-400")}>
                    {SCORE_LABELS[step as keyof typeof SCORE_LABELS]}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
        </div>

        {/* Right Side: Evidence */}
        <div className="p-6">
          <h4 className="text-lg font-medium text-slate-200 mb-6">Evidence from Your Conversation</h4>
          
          {evidence && evidence.length > 0 ? (
            <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar relative before:absolute before:inset-y-0 before:left-[15px] before:w-0.5 before:bg-slate-800">
              {evidence.map((item, idx) => (
                <div key={idx} className="relative flex gap-6">
                  {/* Timeline dot */}
                  <div className="relative z-10 shrink-0 mt-1">
                    <div className="w-8 h-8 rounded-full bg-slate-900 border-2 border-amber-500 flex items-center justify-center text-xs font-bold text-amber-500">
                      {idx + 1}
                    </div>
                  </div>
                  
                  {/* Card */}
                  <div className="flex-1 rounded-lg border border-slate-700 bg-slate-950 p-4">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex gap-2">
                        <span className="text-slate-500 shrink-0">"</span>
                        <p className="text-sm font-medium text-slate-200 italic">
                          {item.message}
                        </p>
                        <span className="text-slate-500 shrink-0">"</span>
                      </div>
                      <span className="shrink-0 inline-flex items-center rounded bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-400 ring-1 ring-inset ring-amber-500/20">
                        {item.classification}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-500 border border-slate-800 border-dashed rounded-lg">
              No verification evidence detected.
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

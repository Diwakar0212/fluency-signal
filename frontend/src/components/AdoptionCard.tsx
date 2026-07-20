import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { cn } from "../lib/utils"

interface DiffChunk {
  op: number
  text: string
}

interface AdoptionCardProps {
  editRatio: number
  aiChars: number
  userChars: number
  adoptionDetails: DiffChunk[]
}

export function AdoptionCard({ editRatio, aiChars, userChars, adoptionDetails }: AdoptionCardProps) {
  const percentage = Math.round(editRatio * 100)
  
  const pieData = [
    { name: "AI Text Reused", value: aiChars },
    { name: "Original / Modified", value: userChars }
  ]
  const COLORS = ["#8b5cf6", "#334155"] // violet-500, slate-700

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-md overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-800 p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-500/20 text-violet-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-100">2. Textual Adoption (AI Text Reuse)</h3>
            <p className="text-sm text-slate-400 mt-1">Measures how much of the final draft text is reused from AI-generated responses.</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-3 rounded-lg bg-violet-950 px-4 py-2 border border-violet-500/30">
            <span className="text-sm font-medium text-violet-300">Textual Adoption Score</span>
            <span className="text-2xl font-bold text-violet-100">{percentage}%</span>
          </div>
          <span className="text-xs text-slate-500 pr-2">of your final draft comes from AI</span>
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
        
        {/* Left Side: Overview Chart */}
        <div className="p-6">
          <h4 className="text-lg font-medium text-slate-200 mb-2">Overview</h4>
          <p className="text-sm text-slate-400 mb-6">We compare your final draft with all AI responses and calculate the percentage of text that was reused (exact or near-exact match).</p>
          
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <div className="h-48 w-48 relative shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }}
                    itemStyle={{ color: '#f1f5f9' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold text-slate-200">{percentage}%</span>
                <span className="text-xs text-slate-400 mt-1">Adoption</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-violet-500" />
                  <span className="font-medium text-slate-200">AI Text Reused</span>
                </div>
                <span className="text-sm text-slate-400 ml-5">{aiChars} characters ({percentage}%)</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-700" />
                  <span className="font-medium text-slate-200">Original / Modified</span>
                </div>
                <span className="text-sm text-slate-400 ml-5">{userChars} characters ({100 - percentage}%)</span>
              </div>
              <div className="pt-2 mt-2 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-transparent border border-slate-600" />
                  <span className="font-medium text-slate-200">Total Final Draft</span>
                </div>
                <span className="text-sm text-slate-400 ml-5">{aiChars + userChars} characters</span>
              </div>
            </div>
          </div>
          
          <div className="mt-8 rounded-lg bg-violet-500/10 border border-violet-500/20 p-4">
            <h5 className="font-medium text-violet-300 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              What does this mean?
            </h5>
            <p className="text-sm text-violet-200/70 mt-1">
              {percentage}% of your final draft is based on text from AI responses. The remaining {100 - percentage}% is original wording or modified by you.
            </p>
          </div>
        </div>

        {/* Right Side: Text Comparison */}
        <div className="p-6">
          <h4 className="text-lg font-medium text-slate-200 mb-2">Text Comparison</h4>
          <p className="text-sm text-slate-400 mb-6 flex items-center gap-4">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-indigo-500/30 inline-block border border-indigo-500/50"></span> Text from AI</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500/30 inline-block border border-emerald-500/50"></span> Your original text</span>
          </p>
          
          <div className="rounded-lg border border-slate-700 bg-slate-950 p-4 whitespace-pre-wrap text-sm leading-relaxed max-h-[400px] overflow-y-auto custom-scrollbar font-medium">
            {adoptionDetails.map((chunk, idx) => {
              if (chunk.op === -1) return null // Skip deletions from AI to build the final draft view
              
              const isAi = chunk.op === 0 // Equal means it came from AI
              
              return (
                <span 
                  key={idx}
                  className={cn(
                    "px-0.5 rounded-sm transition-colors",
                    isAi 
                      ? "bg-indigo-500/20 text-indigo-200 border-b border-indigo-500/30" 
                      : "bg-emerald-500/20 text-emerald-200 border-b border-emerald-500/30"
                  )}
                >
                  {chunk.text}
                </span>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}

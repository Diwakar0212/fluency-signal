import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { cn } from "../lib/utils"

interface PromptDetail {
  message: string
  category: string
}

interface PromptCardProps {
  promptCount: int
  promptDetails: PromptDetail[]
}

const CATEGORY_COLORS: Record<string, string> = {
  clarification: "#3b82f6", // blue-500
  revision: "#22c55e", // green-500
  "new instruction": "#eab308", // yellow-500
  "fact-checking": "#a855f7", // purple-500
  "style change": "#ec4899", // pink-500
  trivial: "#64748b", // slate-500
}

const CATEGORY_STYLES: Record<string, { bg: string, text: string }> = {
  clarification: { bg: "bg-blue-500/20", text: "text-blue-400" },
  revision: { bg: "bg-green-500/20", text: "text-green-400" },
  "new instruction": { bg: "bg-yellow-500/20", text: "text-yellow-400" },
  "fact-checking": { bg: "bg-purple-500/20", text: "text-purple-400" },
  "style change": { bg: "bg-pink-500/20", text: "text-pink-400" },
  trivial: { bg: "bg-slate-500/20", text: "text-slate-400" },
}

export function PromptCard({ promptCount, promptDetails }: PromptCardProps) {
  // Aggregate data for Pie Chart (excluding trivial)
  const categoryCounts = promptDetails.reduce((acc, p) => {
    const cat = p.category.toLowerCase()
    if (cat !== "trivial") {
      acc[cat] = (acc[cat] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  const pieData = Object.entries(categoryCounts).map(([name, value]) => ({
    name,
    value,
  }))

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-md overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-800 p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><path d="M8 12h.01"/><path d="M12 12h.01"/><path d="M16 12h.01"/></svg>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-100">1. Prompt Count (Interaction Depth)</h3>
            <p className="text-sm text-slate-400 mt-1">Measures the number of meaningful prompts you sent to shape the AI output.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-indigo-950 px-4 py-2 border border-indigo-500/30">
          <span className="text-sm font-medium text-indigo-300">Total Meaningful Prompts</span>
          <span className="text-2xl font-bold text-indigo-100">{promptCount}</span>
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
        
        {/* Left Side: Chart & Categories */}
        <div className="p-6">
          <h4 className="text-lg font-medium text-slate-200 mb-6">Prompt Categories</h4>
          <div className="flex flex-col items-center">
            {pieData.length > 0 ? (
              <div className="h-64 w-full relative">
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
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || CATEGORY_COLORS.trivial} />
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
                  <span className="text-2xl font-bold text-slate-200">{promptCount}</span>
                  <span className="text-xs text-slate-400 text-center leading-tight">Meaningful<br/>Prompts</span>
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-500">
                No meaningful prompts recorded.
              </div>
            )}
            
            {/* Category Legend */}
            <div className="w-full mt-6 space-y-3">
              {pieData.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: CATEGORY_COLORS[entry.name] }}
                    />
                    <span className="capitalize text-slate-300">{entry.name}</span>
                  </div>
                  <span className="font-semibold text-slate-200">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
            <span className="text-sm text-emerald-300">Trivial prompts (greetings, thanks, etc.) are not counted.</span>
          </div>
        </div>

        {/* Right Side: Timeline */}
        <div className="p-6">
          <h4 className="text-lg font-medium text-slate-200 mb-6">Your Prompt History</h4>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {promptDetails.map((prompt, idx) => {
              const cat = prompt.category.toLowerCase()
              const style = CATEGORY_STYLES[cat] || CATEGORY_STYLES.trivial
              
              return (
                <div key={idx} className="flex gap-4 p-4 rounded-lg border border-slate-800 bg-slate-900/30">
                  <span className="text-slate-500 font-medium">{idx + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-300 break-words">{prompt.message}</p>
                  </div>
                  <div className="shrink-0">
                    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border border-transparent", style.bg, style.text)}>
                      {prompt.category}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}

import { useState, useRef, useEffect } from 'react';
import { Send, ArrowRight, Sparkles, TrendingUp, ShieldAlert, Cpu } from 'lucide-react';


const API_BASE = 'http://localhost:8000/api';

type Message = {
  role: 'user' | 'ai';
  content: string;
};

type ReportData = {
  prompt_count: number;
  edit_ratio: number;
  verification_score: number;
  ai_interpretation: string;
};

function getVerificationBadge(score: number) {
  switch (score) {
    case 1:
      return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.05)]">Blindly Accepted</span>;
    case 2:
      return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.05)]">Weak Verification</span>;
    case 3:
      return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]">Questioned AI</span>;
    case 4:
      return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.05)]">Actively Verified</span>;
    default:
      return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">Unknown</span>;
  }
}

function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startSession = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/sessions`, { method: 'POST' });
      const data = await res.json();
      setSessionId(data.session_id);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !sessionId) return;

    const userMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Create a temporary message for the AI stream
      setMessages(prev => [...prev, { role: 'ai', content: '' }]);

      const response = await fetch(`${API_BASE}/sessions/${sessionId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userMsg.content }),
      });

      if (!response.body) return;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              setMessages(prev => {
                const newMessages = [...prev];
                const lastIdx = newMessages.length - 1;
                newMessages[lastIdx] = {
                  ...newMessages[lastIdx],
                  content: newMessages[lastIdx].content + data.text
                };
                return newMessages;
              });
            } catch (e) {
              console.error("Parse error", e);
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const submitDraft = async () => {
    if (!sessionId) return;
    if (draft.trim().length < 10) {
      alert("Please write at least 10 characters in your email draft before submitting.");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ final_text: draft }),
      });
      const data = await res.json();
      setReport(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  if (report) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans">
        <div className="max-w-4xl w-full bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-[0_0_50px_-12px_rgba(99,102,241,0.15)] overflow-hidden">
          {/* Header */}
          <div className="border-b border-slate-800/80 p-8 bg-slate-950/40 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-indigo-500/10 text-indigo-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-indigo-500/20 flex items-center gap-1">
                  <Cpu className="w-3 h-3" /> System Evaluation
                </span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-indigo-400">
                Fluency Signal Report
              </h1>
              <p className="text-slate-400 text-sm mt-1">Detailed analysis of your collaboration flow with the AI assistant.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setSessionId(null);
                  setMessages([]);
                  setDraft('');
                  setReport(null);
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-5 py-2.5 rounded-xl font-medium border border-slate-700 transition-all text-sm cursor-pointer shadow-sm"
              >
                Restart Session
              </button>
            </div>
          </div>

          <div className="p-8 space-y-8">
            {/* Grid of Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1 */}
              <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition-colors shadow-inner flex flex-col justify-between min-h-[140px]">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-slate-400">Meaningful Prompts</span>
                  <div className="p-2 bg-cyan-500/10 rounded-xl text-cyan-400 border border-cyan-500/20">
                    <Sparkles className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="text-4xl font-bold tracking-tight text-slate-100">{report.prompt_count}</div>
                  <p className="text-xs text-slate-500 mt-1">Interactions that shaped the draft</p>
                </div>
              </div>

              {/* Card 2 */}
              <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition-colors shadow-inner flex flex-col justify-between min-h-[140px]">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-slate-400">AI Adoption Rate</span>
                  <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline justify-between mb-2">
                    <div className="text-4xl font-bold tracking-tight text-slate-100">{(report.edit_ratio * 100).toFixed(1)}%</div>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, report.edit_ratio * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Card 3 */}
              <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition-colors shadow-inner flex flex-col justify-between min-h-[140px]">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-slate-400">Critical Friction</span>
                  <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="h-10 flex items-center">
                    {getVerificationBadge(report.verification_score)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Behavior with AI assertions</p>
                </div>
              </div>
            </div>

            {/* AI Interpretation */}
            <div className="bg-slate-950/30 rounded-2xl border border-slate-800/60 p-6 md:p-8 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800/80 pb-4">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                <h3 className="text-base font-bold text-slate-200 uppercase tracking-wider">AI Interpretation</h3>
              </div>
              <div className="prose prose-invert max-w-none">
                <p className="text-slate-300 leading-relaxed text-base font-normal">
                  {report.ai_interpretation}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
            <Send className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">The Fluency Signal</h1>
          <p className="text-slate-600">
            Write a cold outreach email with the help of an AI assistant. We'll analyze your collaboration style.
          </p>
          <button
            onClick={startSession}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 group"
          >
            {isLoading ? 'Starting...' : 'Start Assessment'}
            {!isLoading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
      {/* Header */}
      <header className="bg-slate-900/60 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex justify-between items-center z-10">
        <div>
          <h1 className="text-xl font-bold text-indigo-400">Task: Cold Outreach</h1>
          <p className="text-sm text-slate-400 mt-0.5">Draft an email pitching our SaaS tool to Sarah, VP of Eng at TechCorp.</p>
        </div>
        <button
          onClick={submitDraft}
          disabled={isLoading}
          className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-medium shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all cursor-pointer border border-emerald-400/20"
        >
          Submit Draft
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">

        {/* Chat Panel */}
        <div className="w-96 flex-none border-r border-slate-800 bg-slate-900/30 flex flex-col shadow-inner z-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-5 scroll-smooth">
            {messages.length === 0 && (
              <div className="text-center mt-12 px-4">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]">
                  <Sparkles className="w-6 h-6 text-indigo-400" />
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">Chat with the AI assistant here to get ideas, outlines, or full drafts.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm transition-all ${m.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-sm shadow-indigo-900/20'
                  : 'bg-slate-800 text-slate-200 rounded-bl-sm border border-slate-700/50'
                  }`}>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-slate-900/50 border-t border-slate-800 backdrop-blur-sm">
            <form onSubmit={sendMessage} className="relative group">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask the AI for help..."
                className="w-full bg-slate-950 border border-slate-700 rounded-full pl-5 pr-12 py-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all shadow-inner"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="absolute right-2 top-2 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 transition-colors shadow-md"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Editor Panel */}
        <div className="flex-1 p-6 bg-slate-950 flex flex-col relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="bg-slate-900/80 backdrop-blur-sm rounded-t-2xl border border-slate-800 border-b-0 px-5 py-3.5 flex items-center justify-between shadow-sm relative z-10">
            <div className="font-semibold text-slate-300 text-sm flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
              Your Email Draft
            </div>
          </div>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Type your final email here... feel free to copy-paste from the AI and edit."
            className="flex-1 w-full p-8 bg-slate-900/40 backdrop-blur-sm border border-slate-800 rounded-b-2xl shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 resize-none font-sans text-slate-200 leading-relaxed text-base relative z-10 transition-all"
          />
        </div>

      </main>
    </div>
  );
}

export default App;

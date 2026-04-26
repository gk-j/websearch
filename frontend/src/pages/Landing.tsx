import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUp, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/Sidebar";

const SUGGESTED = [
  "How does quantum computing work?",
  "Latest developments in AI",
  "What is the James Webb telescope discovering?",
  "How to learn system design",
  "Explain React Server Components",
  "Best programming languages in 2025",
];

export default function Landing() {
  const [query, setQuery] = useState("");
  const { user, token, loading, signOut } = useAuth();
  const navigate = useNavigate();

  function submit(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="flex h-screen bg-[#0f0f0f] text-zinc-100 overflow-hidden">
      {!loading && user && (
        <Sidebar token={token} user={user} onSignOut={signOut} />
      )}

      <main className="flex-1 flex flex-col items-center justify-center px-6 overflow-y-auto relative">
        {!loading && !user && (
          <button
            onClick={() => navigate("/auth")}
            className="absolute top-5 right-5 px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-[#0f0f0f] text-sm font-semibold transition-colors"
          >
            Sign in
          </button>
        )}

        <div className="w-full max-w-2xl">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-zinc-100 tracking-tight mb-2">
              Perplexity
            </h1>
            <p className="text-zinc-500 text-lg">Where knowledge begins</p>
          </div>

          <div className="relative mb-6">
            <div className="flex items-center gap-3 bg-[#1c1c1c] border border-white/[0.08] rounded-2xl px-4 py-3.5 focus-within:border-teal-500/40 transition-colors shadow-lg">
              <Search size={18} className="text-zinc-600 flex-shrink-0" />
              <input
                className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-600 outline-none text-base"
                placeholder="Ask anything..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit(query)}
                autoFocus
              />
              <button
                onClick={() => submit(query)}
                disabled={!query.trim()}
                className="w-8 h-8 rounded-lg bg-teal-500 hover:bg-teal-400 disabled:bg-zinc-800 disabled:cursor-not-allowed flex items-center justify-center transition-colors flex-shrink-0"
              >
                <ArrowUp size={16} className="text-[#0f0f0f]" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            {SUGGESTED.map((s) => (
              <button
                key={s}
                onClick={() => submit(s)}
                className="px-3 py-1.5 rounded-full text-sm text-zinc-500 bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] hover:border-white/[0.14] hover:text-zinc-300 transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Globe, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/Sidebar";
import { fetchConversation, parseResponse } from "@/lib/api";
import { renderMarkdown } from "@/lib/markdown";

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const { user, token, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading]);

  useEffect(() => {
    if (!token || !id) return;
    fetchConversation(id, token)
      .then((data) => setConversation(data.conversation))
      .catch(() => setError("Conversation not found."));
  }, [token, id]);

  return (
    <div className="flex h-screen bg-[#0f0f0f] text-zinc-100 overflow-hidden">
      <Sidebar token={token} user={user} onSignOut={signOut} />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-10 space-y-10">
          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          {!conversation && !error && (
            <div className="flex items-center gap-2 text-zinc-500 text-sm mt-4">
              <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              <span className="ml-1">Loading…</span>
            </div>
          )}

          {conversation?.messages?.map((msg: any, i: number) => {
            if (msg.role === "User") {
              return (
                <h2 key={i} className="text-2xl font-semibold text-zinc-100 leading-snug">
                  {msg.content}
                </h2>
              );
            }

            const parsed = parseResponse(msg.content);
            return (
              <div key={i} className="space-y-6">
                {parsed.sources.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3 text-zinc-500 text-sm">
                      <Globe size={13} />
                      <span>Sources</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {parsed.sources.slice(0, 8).map((s, j) => {
                        let hostname = s.url;
                        try { hostname = new URL(s.url).hostname.replace("www.", ""); } catch {}
                        return (
                          <a
                            key={j}
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-zinc-500 hover:text-zinc-300 text-xs transition-all"
                          >
                            <span className="text-teal-400 font-medium">{j + 1}</span>
                            <img
                              src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=16`}
                              className="w-3.5 h-3.5 rounded-sm"
                              onError={(e) => { e.currentTarget.style.display = "none"; }}
                              alt=""
                            />
                            <span className="max-w-[110px] truncate">{hostname}</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {parsed.answer && (
                  <div
                    className="text-zinc-300 leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: `<p style="margin:0.7em 0;color:#d4d4d8">${renderMarkdown(parsed.answer)}</p>`,
                    }}
                  />
                )}

                {parsed.questions.length > 0 && (
                  <div>
                    <p className="text-zinc-600 text-sm mb-3">Related</p>
                    <div className="space-y-2">
                      {parsed.questions.map((q, j) => (
                        <button
                          key={j}
                          onClick={() => navigate(`/search?q=${encodeURIComponent(q)}`)}
                          className="w-full text-left flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.1] text-zinc-400 hover:text-zinc-200 text-sm transition-all group"
                        >
                          <span>{q}</span>
                          <ChevronRight size={14} className="text-zinc-700 group-hover:text-zinc-500 flex-shrink-0 transition-colors" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

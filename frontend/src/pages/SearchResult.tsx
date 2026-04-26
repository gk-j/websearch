import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowUp, Globe, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/Sidebar";
import { streamAsk, streamFollowUp, parseResponse, getStreamingAnswer } from "@/lib/api";
import { renderMarkdown } from "@/lib/markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
  answer?: string;
  sources?: { url: string }[];
  questions?: string[];
}

export default function SearchResult() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  const { user, token, loading, signOut } = useAuth();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [rawStream, setRawStream] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [followInput, setFollowInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasSearched = useRef(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading]);

  useEffect(() => {
    if (!initialQuery || !token || hasSearched.current) return;
    hasSearched.current = true;
    doSearch(initialQuery);
  }, [initialQuery, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [rawStream, messages.length]);

  async function doSearch(q: string) {
    if (!token) return;
    setStreaming(true);
    setRawStream("");

    setMessages((prev) => [
      ...prev,
      { role: "user", content: q },
    ]);

    let fullText = "";

    try {
      for await (const event of streamAsk(q, token)) {
        if (event.type === "init" && event.conversationId) {
          setConversationId(event.conversationId);
        } else if (event.type === "chunk") {
          fullText += event.text;
          setRawStream(fullText);
        }
      }
    } catch (err) {
      console.error(err);
    }

    const parsed = parseResponse(fullText);
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: fullText,
        answer: parsed.answer,
        sources: parsed.sources,
        questions: parsed.questions,
      },
    ]);
    setRawStream("");
    setStreaming(false);
    window.dispatchEvent(new CustomEvent("conversations-updated"));
  }

  async function doFollowUp(q: string) {
    const trimmed = q.trim();
    if (!trimmed || !token || !conversationId || streaming) return;
    setFollowInput("");
    setStreaming(true);
    setRawStream("");

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);

    let fullText = "";
    try {
      for await (const chunk of streamFollowUp(trimmed, conversationId, token)) {
        fullText += chunk;
        setRawStream(fullText);
      }
    } catch (err) {
      console.error(err);
    }

    const parsed = parseResponse(fullText);
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: fullText,
        answer: parsed.answer,
        sources: parsed.sources,
        questions: parsed.questions,
      },
    ]);
    setRawStream("");
    setStreaming(false);
  }

  const streamingAnswer = getStreamingAnswer(rawStream);

  return (
    <div className="flex h-screen bg-[#0f0f0f] text-zinc-100 overflow-hidden">
      <Sidebar token={token} user={user} onSignOut={signOut} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Scrollable messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-10 space-y-10">
            {messages.map((msg, i) =>
              msg.role === "user" ? (
                <h2
                  key={i}
                  className="text-2xl font-semibold text-zinc-100 leading-snug"
                >
                  {msg.content}
                </h2>
              ) : (
                <AssistantBlock
                  key={i}
                  answer={msg.answer ?? ""}
                  sources={msg.sources ?? []}
                  questions={msg.questions ?? []}
                  onFollowUp={doFollowUp}
                />
              )
            )}

            {/* Live streaming */}
            {streaming && (
              <div>
                {streamingAnswer ? (
                  <div
                    className="text-zinc-300 leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: `<p style="margin:0.7em 0;color:#d4d4d8">${renderMarkdown(streamingAnswer)}</p>`,
                    }}
                  />
                ) : (
                  <div className="flex items-center gap-2 text-zinc-500 text-sm">
                    <span
                      className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                    <span className="ml-1">Searching the web…</span>
                  </div>
                )}
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Follow-up bar */}
        <div className="border-t border-white/[0.06] bg-[#0f0f0f] px-4 py-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 bg-[#1c1c1c] border border-white/[0.08] rounded-xl px-4 py-3 focus-within:border-teal-500/40 transition-colors">
              <input
                className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-600 outline-none text-sm"
                placeholder="Ask a follow-up…"
                value={followInput}
                onChange={(e) => setFollowInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doFollowUp(followInput)}
                disabled={streaming}
              />
              <button
                onClick={() => doFollowUp(followInput)}
                disabled={!followInput.trim() || streaming}
                className="w-7 h-7 rounded-lg bg-teal-500 hover:bg-teal-400 disabled:bg-zinc-800 disabled:cursor-not-allowed flex items-center justify-center transition-colors flex-shrink-0"
              >
                <ArrowUp size={14} className="text-[#0f0f0f]" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function AssistantBlock({
  answer,
  sources,
  questions,
  onFollowUp,
}: {
  answer: string;
  sources: { url: string }[];
  questions: string[];
  onFollowUp: (q: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Sources */}
      {sources.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3 text-zinc-500 text-sm">
            <Globe size={13} />
            <span>Sources</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {sources.slice(0, 8).map((s, i) => (
              <SourcePill key={i} url={s.url} index={i + 1} />
            ))}
          </div>
        </div>
      )}

      {/* Answer */}
      {answer && (
        <div
          className="text-zinc-300 leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: `<p style="margin:0.7em 0;color:#d4d4d8">${renderMarkdown(answer)}</p>`,
          }}
        />
      )}

      {/* Follow-up questions */}
      {questions.length > 0 && (
        <div>
          <p className="text-zinc-600 text-sm mb-3">Related</p>
          <div className="space-y-2">
            {questions.map((q, i) => (
              <button
                key={i}
                onClick={() => onFollowUp(q)}
                className="w-full text-left flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.1] text-zinc-400 hover:text-zinc-200 text-sm transition-all group"
              >
                <span>{q}</span>
                <ChevronRight
                  size={14}
                  className="text-zinc-700 group-hover:text-zinc-500 flex-shrink-0 transition-colors"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SourcePill({ url, index }: { url: string; index: number }) {
  let hostname = url;
  try {
    hostname = new URL(url).hostname.replace("www.", "");
  } catch {}

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.1] text-zinc-500 hover:text-zinc-300 text-xs transition-all"
    >
      <span className="text-teal-400 font-medium">{index}</span>
      <img
        src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=16`}
        className="w-3.5 h-3.5 rounded-sm"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
        alt=""
      />
      <span className="max-w-[110px] truncate">{hostname}</span>
    </a>
  );
}

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, LogOut, MessageSquare, User } from "lucide-react";
import { fetchConversations } from "@/lib/api";
import type { User as SupaUser } from "@supabase/supabase-js";

interface Conversation {
  id: string;
  title: string | null;
  slug: string;
}

interface SidebarProps {
  token: string | null;
  user: SupaUser | null;
  onSignOut: () => void;
}

export default function Sidebar({ token, user, onSignOut }: SidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  async function load() {
    if (!token) return;
    try {
      const data = await fetchConversations(token);
      setConversations(data.conversations ?? []);
    } catch {}
  }

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener("conversations-updated", handler);
    return () => window.removeEventListener("conversations-updated", handler);
  }, [token]);

  return (
    <aside className="w-64 flex-shrink-0 h-screen bg-[#131313] border-r border-white/[0.06] flex flex-col">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-white/[0.06]">
        <button
          onClick={() => navigate("/")}
          className="text-teal-400 font-bold text-xl tracking-tight hover:text-teal-300 transition-colors"
        >
          Perplexity
        </button>
      </div>

      {/* New Thread */}
      <div className="px-3 pt-3 pb-1">
        <button
          onClick={() => navigate("/")}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-teal-400 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 transition-colors"
        >
          <Plus size={15} />
          New Thread
        </button>
      </div>

      {/* Conversation list */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {conversations.length === 0 && (
          <p className="text-zinc-600 text-xs text-center mt-6 px-3">
            No threads yet
          </p>
        )}
        {conversations.map((conv) => {
          const isActive =
            location.pathname === `/conversation/${conv.id}`;
          return (
            <button
              key={conv.id}
              onClick={() => navigate(`/conversation/${conv.id}`)}
              className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors truncate ${
                isActive
                  ? "bg-white/10 text-zinc-100"
                  : "text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-300"
              }`}
            >
              <MessageSquare size={13} className="flex-shrink-0 opacity-60" />
              <span className="truncate">{conv.title ?? "Untitled"}</span>
            </button>
          );
        })}
      </nav>

      {/* User */}
      {user && (
        <div className="px-3 py-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
            <div className="w-6 h-6 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0">
              <User size={12} className="text-teal-400" />
            </div>
            <span className="text-zinc-500 text-xs flex-1 truncate">
              {user.email}
            </span>
            <button
              onClick={onSignOut}
              title="Sign out"
              className="text-zinc-700 hover:text-zinc-400 transition-colors"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

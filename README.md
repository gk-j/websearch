# Perplexity Clone

A full-stack AI search engine that works like Perplexity: you ask a question, it searches the web in real time, feeds the results to an LLM, and streams a cited answer back to you — along with follow-up questions to keep the conversation going.

---

## How it works

When a user submits a query, the backend immediately fires off a **Tavily web search** (advanced depth) to pull fresh sources. Those results are injected into a prompt that gets sent to **GPT-5 via OpenRouter**, and the response is streamed token-by-token back to the browser. The LLM is instructed to format its output with structured XML tags — `<ANSWER>`, `<FOLLOWUP>`, and `<SOURCES>` — which the frontend parses to render the answer, clickable source pills, and related question chips.

Every conversation and every message is persisted to **Postgres via Prisma**, so users can revisit past searches from the sidebar. Authentication is handled entirely by **Supabase** (Google OAuth and GitHub OAuth), which issues a JWT that the frontend passes as a Bearer token on every API call. The backend middleware verifies that token against Supabase and auto-creates the user row in the database on first login.

---

## Architecture

```
                   ┌──────────────┐
                   │   FRONTEND   │  React 19 + Bun (port 3000)
                   │  (browser)   │
                   └──────┬───────┘
                          │  REST + streaming HTTP
                          ▼
                   ┌──────────────┐
                   │   BACKEND    │  Express + Bun (port 3001)
                   │  (API server)│
                   └──┬───────┬───┘
                      │       │
            ┌─────────┘       └──────────────┐
            ▼                                ▼
   ┌─────────────────┐            ┌──────────────────┐
   │    SUPABASE      │            │    POSTGRES DB    │
   │  (auth + users) │◄──────────►│  (Prisma ORM)    │
   └─────────────────┘            └──────────────────┘
            ▲
     ┌──────┴──────┐
     │             │
  Google         GitHub
  OAuth          OAuth

External APIs called by the backend:
  • Tavily  — real-time web search
  • OpenRouter (GPT-5) — LLM completions, streamed
```

**Auth flow:** The user signs in through Supabase (Google or GitHub). Supabase issues a JWT. The frontend stores it and attaches it to every backend request. The backend's middleware calls Supabase to validate the token and resolves the user, creating a local DB record on first access.

**Search flow:**
1. Frontend POSTs the query to `/perplexity_ask`
2. Backend runs Tavily search → gets ranked web results
3. Backend creates a `Conversation` row in Postgres and sets `X-Conversation-Id` on the response header
4. Backend injects web results into the prompt template and streams GPT-5's response back
5. The LLM wraps its reply in `<ANSWER>…</ANSWER>`, `<FOLLOWUP>…</FOLLOWUP>`, `<SOURCES>…</SOURCES>`
6. Frontend reads the stream incrementally, shows live typing, then parses the final XML to render structured output
7. Backend saves the assistant's full message to Postgres

---

## Folder structure

```
perplexity/
├── backend/                    # Express API server
│   ├── index.ts                # All routes: /conversations, /perplexity_ask, /conversation/follow-up
│   ├── middleware.ts           # Auth middleware — validates Supabase JWT, creates user on first login
│   ├── client.ts               # Supabase admin client factory
│   ├── db.ts                   # Prisma client setup (Postgres via PrismaPg adapter)
│   ├── prompt.ts               # SYSTEM_PROMPT and PROMPT_TEMPLATE used for LLM calls
│   ├── prisma/
│   │   └── schema.prisma       # DB schema: User, Conversation, Message models
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/                   # React SPA served by Bun
    └── src/
        ├── index.ts            # Bun.serve() entry point — serves the HTML and routes
        ├── index.html          # HTML shell that loads frontend.tsx
        ├── frontend.tsx        # React root mount
        ├── App.tsx             # Client-side router with 4 routes
        ├── index.css           # Global styles + Tailwind
        │
        ├── pages/
        │   ├── Landing.tsx         # Home page with search bar
        │   ├── Auth.tsx            # OAuth sign-in page (Google + GitHub via Supabase)
        │   ├── SearchResult.tsx    # Main search UI — handles streaming, sources, follow-ups
        │   ├── ConversationPage.tsx# Replays a saved conversation from history
        │   └── Dashboard.tsx       # (in progress)
        │
        ├── components/
        │   ├── Sidebar.tsx         # Past conversations list, sign-out
        │   └── ui/                 # Headless UI primitives (button, card, input, etc.)
        │
        ├── hooks/
        │   └── useAuth.ts          # Reads Supabase session, exposes user + token
        │
        └── lib/
            ├── api.ts              # Typed fetch helpers — streamAsk, streamFollowUp, parseResponse
            ├── config.ts           # BACKEND_URL constant
            ├── markdown.ts         # Lightweight markdown → HTML renderer for streamed answers
            ├── utils.ts            # cn() class merging utility
            └── supabase/
                ├── client.ts       # Browser-side Supabase client
                └── server.ts       # SSR-safe Supabase client (cookie-based)
```

---

## Database schema

| Table          | Key columns                                          |
|----------------|------------------------------------------------------|
| `User`         | `id`, `email`, `name`, `provider` (Google/Github), `supabaseId` |
| `Conversation` | `id`, `title`, `slug`, `userId`                      |
| `Message`      | `id`, `content`, `role` (User/Assistant), `conversationId`, `createdAt` |

---

## Running locally

**Backend** (port 3001):
```bash
cd backend
bun install
bun index.ts
```

Required `.env` variables:
```
DATABASE_URL=...
SUPABASE_API_SECRET=...
OPEN_ROUTER_API_KEY=...
TAVILY_API_KEY=...
```

**Frontend** (port 3000):
```bash
cd frontend
bun install
bun --hot src/index.ts
```

---

## Key technology choices

| Concern | Choice | Why |
|---|---|---|
| Runtime | Bun | Fast startup, built-in bundler, native TypeScript |
| Frontend | React 19 + React Router | Component model + client-side routing |
| Styling | Tailwind CSS v4 | Utility-first, zero config with Bun |
| Backend | Express (on Bun) | Simple HTTP server with middleware |
| ORM | Prisma 7 | Type-safe queries, clean schema-first workflow |
| Database | PostgreSQL (via Supabase) | Managed, co-located with auth |
| Auth | Supabase | Handles OAuth providers + JWT with minimal code |
| Web search | Tavily | Purpose-built for LLM retrieval, returns clean ranked results |
| LLM | GPT-5 via OpenRouter | Best reasoning quality; OpenRouter allows model-switching |
| Streaming | Native `fetch` + `ReadableStream` | No SSE library needed, works end-to-end |

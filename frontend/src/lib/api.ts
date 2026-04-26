import { BACKEND_URL } from "./config";

export async function fetchConversations(token: string) {
  const res = await fetch(`${BACKEND_URL}/conversations`, {
    headers: { Authorization: token },
  });
  if (!res.ok) throw new Error("Failed to fetch conversations");
  return res.json();
}

export async function fetchConversation(id: string, token: string) {
  const res = await fetch(`${BACKEND_URL}/conversation/${id}`, {
    headers: { Authorization: token },
  });
  if (!res.ok) throw new Error("Failed to fetch conversation");
  return res.json();
}

export async function* streamAsk(query: string, token: string) {
  const res = await fetch(`${BACKEND_URL}/perplexity_ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify({ query }),
  });

  const conversationId = res.headers.get("X-Conversation-Id");
  yield { type: "init" as const, conversationId };

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield { type: "chunk" as const, text: decoder.decode(value, { stream: true }) };
  }
}

export async function* streamFollowUp(query: string, conversationId: string, token: string) {
  const res = await fetch(`${BACKEND_URL}/coversation/follow-up`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify({ query, conversationId }),
  });

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield decoder.decode(value, { stream: true });
  }
}

export function parseResponse(text: string) {
  const answerMatch = text.match(/<ANSWER>([\s\S]*?)<\/ANSWER>/);
  const followupMatch = text.match(/<FOLLOWUP>([\s\S]*?)<\/FOLLOWUP>/);
  const sourcesMatch = text.match(/<SOURCES>([\s\S]*?)<\/SOURCES>/);

  const answer = answerMatch?.[1]?.trim() ?? "";

  const questions: string[] = [];
  if (followupMatch) {
    for (const m of followupMatch[1].matchAll(/<question>([\s\S]*?)<\/question>/g)) {
      questions.push(m[1].trim());
    }
  }

  let sources: { url: string }[] = [];
  if (sourcesMatch) {
    try { sources = JSON.parse(sourcesMatch[1].trim()); } catch {}
  }

  return { answer, questions, sources };
}

export function getStreamingAnswer(text: string): string {
  if (!text.includes("<ANSWER>")) return "";
  const after = text.split("<ANSWER>")[1];
  if (after.includes("</ANSWER>")) return after.split("</ANSWER>")[0].trim();
  return after.trim();
}

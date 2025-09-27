export const SYSTEM_PROMPT = `You are a helpful, concise AI assistant living in a Cloudflare Workers app.
You answer clearly, cite facts when relevant, and ask brief follow-up questions when needed.
If the user asks you to remember preferences, acknowledge and rely on long-term memory provided by the orchestrator.
`;

export function clampHistory<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr;
  return arr.slice(arr.length - max);
}

export interface ChatTurn {
  role: "user" | "assistant" | "system";
  content: string;
  ts: number;
}

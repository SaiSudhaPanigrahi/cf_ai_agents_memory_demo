import { SYSTEM_PROMPT, ChatTurn } from "./agent";
import { MemoryDO } from "./memory";

export interface Env {
  AI: Ai; // Workers AI binding
  MEMORY_DO: DurableObjectNamespace;
}

const MODEL = "@cf/meta/llama-3.3-70b-instruct"; // change to a model available in your account

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Static assets (served by assets binding configured in wrangler.toml)
    if (url.pathname === "/api/health") {
      return new Response("ok", { status: 200 });
    }

    if (url.pathname === "/api/chat" && request.method === "POST") {
      const body = await request.json();
      const sessionId: string = body.sessionId || "default";
      const user: string = body.user || "anon";
      const text: string = (body.text || "").toString().trim();

      if (!text) return Response.json({ error: "empty input" }, { status: 400 });

      // Load memory from DO
      const id = env.MEMORY_DO.idFromName(sessionId);
      const stub = env.MEMORY_DO.get(id);

      const memResp = await stub.fetch(new Request(new URL("/memory", request.url), { method: "GET" }));
      const mem = await memResp.json() as { turns: ChatTurn[]; summary: string; maxTurns: number };

      // Build messages
      const messages = [
        { role: "system", content: SYSTEM_PROMPT },
      ] as { role: "system" | "user" | "assistant"; content: string }[];

      if (mem.summary) {
        messages.push({ role: "system", content: `Long-term memory summary:
${mem.summary}` });
      }

      for (const t of mem.turns) {
        messages.push({ role: t.role, content: t.content });
      }
      messages.push({ role: "user", content: text });

      // Call Workers AI
      const result = await env.AI.run(MODEL, {
        messages,
        // You can add extra parameters like temperature, top_p if supported
      } as any);

      const reply: string = result?.response ?? result?.output_text ?? JSON.stringify(result);

      // Update memory: append user + assistant turn
      await stub.fetch(new Request(new URL("/memory", request.url), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "append", turn: { role: "user", content: text, ts: Date.now() } })
      }));
      await stub.fetch(new Request(new URL("/memory", request.url), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "append", turn: { role: "assistant", content: reply, ts: Date.now() } })
      }));

      // Optionally refresh summary every N turns
      if ((mem.turns.length + 2) % 6 === 0) {
        const summaryMessages = [
          { role: "system", content: "Summarize the following conversation into <= 120 words focusing on user preferences and long-term facts." },
          { role: "user", content: JSON.stringify(mem.turns.slice(-12)) }
        ];
        const sum = await env.AI.run(MODEL, { messages: summaryMessages } as any);
        const summaryText = sum?.response ?? sum?.output_text ?? "";
        await stub.fetch(new Request(new URL("/memory", request.url), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ type: "setSummary", summary: summaryText })
        }));
      }

      return Response.json({
        reply,
        sessionId,
        memory: {
          turns: (mem.turns.length + 2),
          summaryTokens: (mem.summary || "").length
        }
      });
    }

    // Fallback to static assets (served automatically)
    return new Response("Not found", { status: 404 });
  },
};

export { MemoryDO };

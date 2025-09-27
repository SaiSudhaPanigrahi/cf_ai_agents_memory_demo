import { clampHistory, ChatTurn } from "./agent";

interface StoredMemory {
  turns: ChatTurn[];
  summary: string; // rolling recap beyond the last N turns
  updatedAt: number;
  maxTurns: number;
}

export class MemoryDO {
  state: DurableObjectState;
  env: any;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const key = "memory";
    if (req.method === "GET") {
      const mem = (await this.state.storage.get<StoredMemory>(key)) ?? this.defaultMemory();
      return Response.json(mem);
    }
    if (req.method === "POST") {
      const body = await req.json();
      if (body.type === "append") {
        const mem = (await this.state.storage.get<StoredMemory>(key)) ?? this.defaultMemory();
        const turn: ChatTurn = body.turn;
        mem.turns.push(turn);
        mem.turns = clampHistory(mem.turns, mem.maxTurns);
        mem.updatedAt = Date.now();
        await this.state.storage.put(key, mem);
        return Response.json({ ok: true });
      }
      if (body.type === "setSummary") {
        const mem = (await this.state.storage.get<StoredMemory>(key)) ?? this.defaultMemory();
        mem.summary = body.summary ?? "";
        mem.updatedAt = Date.now();
        await this.state.storage.put(key, mem);
        return Response.json({ ok: true });
      }
      if (body.type === "reset") {
        const mem = this.defaultMemory();
        await this.state.storage.put(key, mem);
        return Response.json({ ok: true });
      }
      return new Response("bad request", { status: 400 });
    }
    return new Response("not found", { status: 404 });
  }

  defaultMemory(): StoredMemory {
    return {
      turns: [],
      summary: "",
      updatedAt: Date.now(),
      maxTurns: 12,
    };
  }
}

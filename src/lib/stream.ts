import type { StreamEvent } from "./types";

/** Resposta NDJSON em streaming; o handler emite eventos conforme o trabalho avança. */
export function ndjsonResponse(handler: (emit: (e: StreamEvent) => void, signal: AbortSignal) => Promise<void>): Response {
  const encoder = new TextEncoder();
  const controller = new AbortController();
  const stream = new ReadableStream<Uint8Array>({
    async start(ctrl) {
      const emit = (e: StreamEvent) => {
        try {
          ctrl.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
        } catch {
          /* cliente desconectou */
        }
      };
      // heartbeat para proxies não fecharem a conexão
      const hb = setInterval(() => {
        try {
          ctrl.enqueue(encoder.encode("\n"));
        } catch {
          clearInterval(hb);
        }
      }, 15000);
      try {
        await handler(emit, controller.signal);
        emit({ type: "done" });
      } catch (err) {
        emit({ type: "error", message: errorMessage(err) });
      } finally {
        clearInterval(hb);
        try {
          ctrl.close();
        } catch {
          /* já fechado */
        }
      }
    },
    cancel() {
      controller.abort();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

/** Lê um stream NDJSON no cliente e chama onEvent para cada linha. */
export async function readNdjson(res: Response, onEvent: (e: StreamEvent) => void): Promise<void> {
  if (!res.ok || !res.body) {
    let msg = `Erro ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {
      /* corpo não é JSON */
    }
    throw new Error(msg);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      try {
        onEvent(JSON.parse(line) as StreamEvent);
      } catch {
        /* linha parcial/corrompida */
      }
    }
  }
  if (buf.trim()) {
    try {
      onEvent(JSON.parse(buf.trim()) as StreamEvent);
    } catch {
      /* ignora */
    }
  }
}

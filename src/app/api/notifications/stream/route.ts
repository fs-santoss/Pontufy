import { NextRequest } from 'next/server';
import { getSessionContext } from '@/backend/session';

type Listener = {
  tenantId: string;
  userId: string;
  controller: ReadableStreamDefaultController;
};

// LIMITATION: module-level state is per-instance on serverless — broadcasts
// from other API routes (generate, queue-worker) won't reach SSE listeners.
// A Redis Pub/Sub channel is needed for cross-instance delivery.
const listeners: Listener[] = [];

export function broadcastToTenant(tenantId: string, event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (let i = listeners.length - 1; i >= 0; i--) {
    if (listeners[i].tenantId === tenantId) {
      try {
        listeners[i].controller.enqueue(new TextEncoder().encode(payload));
      } catch {
        listeners.splice(i, 1);
      }
    }
  }
}

export async function GET(request: NextRequest) {
  let session;
  try {
    session = await getSessionContext();
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }

  const { tenantId, userId } = session;

  const stream = new ReadableStream({
    start(controller) {
      const listener: Listener = { tenantId, userId, controller };
      listeners.push(listener);

      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(': keepalive\n\n'));
        } catch {
          clearInterval(keepAlive);
        }
      }, 30000);

      controller.enqueue(new TextEncoder().encode(`event: connected\ndata: ${JSON.stringify({ userId, tenantId })}\n\n`));

      request.signal.addEventListener('abort', () => {
        clearInterval(keepAlive);
        const idx = listeners.indexOf(listener);
        if (idx !== -1) listeners.splice(idx, 1);
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

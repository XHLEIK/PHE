import { NextRequest } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Complaint from '@/lib/models/Complaint';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * SSE endpoint: streams new/updated complaints to connected admin clients.
 * Clients receive a JSON event every time a complaint is created or updated
 * (polled every 5 seconds internally).
 */
export async function GET(req: NextRequest) {
  const token = req.cookies.get('access_token')?.value;
  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    return new Response('Unauthorized', { status: 401 });
  }

  await connectDB();

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      // Keep track of the last check timestamp
      let lastCheck = new Date();

      const send = (data: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          closed = true;
        }
      };

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        if (closed) { clearInterval(heartbeat); return; }
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          closed = true;
          clearInterval(heartbeat);
        }
      }, 15_000);

      // Poll for new/updated complaints every 5 seconds
      const poll = setInterval(async () => {
        if (closed) { clearInterval(poll); return; }
        try {
          const since = lastCheck;
          lastCheck = new Date();

          const updated = await Complaint.find({
            updatedAt: { $gt: since },
          })
            .sort({ updatedAt: -1 })
            .limit(10)
            .select('complaintId title status priority department updatedAt')
            .lean();

          if (updated.length > 0) {
            send(JSON.stringify({ type: 'complaints_updated', data: updated, timestamp: lastCheck.toISOString() }));
          }
        } catch {
          // Silently continue on DB errors
        }
      }, 5_000);

      // Cleanup on abort
      req.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(heartbeat);
        clearInterval(poll);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering
    },
  });
}

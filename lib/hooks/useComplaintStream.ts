'use client';

import { useEffect, useRef, useCallback } from 'react';

interface SSEComplaintEvent {
  type: 'complaints_updated';
  data: Array<{
    _id: string;
    complaintId: string;
    title: string;
    status: string;
    priority: string;
    department: string;
    updatedAt: string;
  }>;
  timestamp: string;
}

/**
 * Subscribe to the complaint SSE stream.
 * Calls `onUpdate` whenever new/updated complaints arrive.
 * Auto-reconnects with exponential backoff (max 30s).
 */
export function useComplaintStream(onUpdate: (event: SSEComplaintEvent) => void) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const connect = useCallback(() => {
    let retryDelay = 2_000;
    let es: EventSource | null = null;

    const open = () => {
      es = new EventSource('/api/complaints/stream');

      es.onmessage = (e) => {
        try {
          const parsed: SSEComplaintEvent = JSON.parse(e.data);
          onUpdateRef.current(parsed);
        } catch {
          // Ignore non-JSON messages (heartbeats)
        }
      };

      es.onopen = () => {
        retryDelay = 2_000; // Reset backoff on success
      };

      es.onerror = () => {
        es?.close();
        // Reconnect with exponential backoff
        setTimeout(open, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 30_000);
      };
    };

    open();

    return () => {
      es?.close();
    };
  }, []);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);
}

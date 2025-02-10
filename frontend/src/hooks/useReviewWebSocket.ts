import { useCallback, useEffect, useRef, useState } from "react";
import { useReviewStore } from "@/store/reviewStore";
import type { WSMessage } from "@/types";

const WS_BASE = import.meta.env.VITE_WS_URL || "ws://localhost:8000";

/**
 * Manages the WebSocket connection for a review session.
 * Handles reconnection with exponential backoff and routes
 * incoming messages to the zustand store.
 */
export function useReviewWebSocket(sessionId: string | undefined) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnect = 5;
  const [isConnected, setIsConnected] = useState(false);

  const {
    addAnnotation,
    addCommentToAnnotation,
    resolveAnnotation,
    updateCursor,
    addUser,
    removeUser,
    addSuggestion,
  } = useReviewStore();

  const connect = useCallback(() => {
    if (!sessionId) return;

    const ws = new WebSocket(`${WS_BASE}/ws/review/${sessionId}/`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      reconnectAttempts.current = 0;
      // console.log(`[WS] connected to session ${sessionId}`);
    };

    ws.onmessage = (event) => {
      const msg: WSMessage = JSON.parse(event.data);

      switch (msg.type) {
        case "annotation.created":
          addAnnotation(msg.annotation as never);
          break;
        case "comment.created":
          addCommentToAnnotation(
            (msg.comment as { annotation_id: string }).annotation_id,
            msg.comment as never
          );
          break;
        case "annotation.resolved":
          resolveAnnotation(msg.annotation_id as string);
          break;
        case "cursor.updated":
          updateCursor(msg as never);
          break;
        case "user.joined":
          addUser(msg.user as { id: number; username: string });
          break;
        case "user.left":
          removeUser((msg.user as { id: number }).id);
          break;
        case "suggestion.ready":
          addSuggestion(msg.suggestion as never);
          break;
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      if (reconnectAttempts.current < maxReconnect) {
        const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30000);
        reconnectAttempts.current += 1;
        setTimeout(connect, delay);
      }
    };

    ws.onerror = () => ws.close();
  }, [
    sessionId, addAnnotation, addCommentToAnnotation, resolveAnnotation,
    updateCursor, addUser, removeUser, addSuggestion,
  ]);

  useEffect(() => {
    connect();
    return () => { wsRef.current?.close(); };
  }, [connect]);

  const sendMessage = useCallback(
    (type: string, payload: Record<string, unknown>) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type, ...payload }));
      }
    },
    []
  );

  return { isConnected, sendMessage };
}

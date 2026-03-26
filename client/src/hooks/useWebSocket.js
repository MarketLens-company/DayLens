import { useEffect, useRef, useCallback } from 'react';

const TOKEN_KEY = 'daylens_token';

export function useWebSocket(onMessage) {
  const wsRef = useRef(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${protocol}://${window.location.host}/ws`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Connected');
      // Send auth token immediately after connecting
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        ws.send(JSON.stringify({ type: 'auth', token }));
      }
    };

    ws.onmessage = e => {
      try {
        const msg = JSON.parse(e.data);
        onMessageRef.current(msg);
      } catch {}
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected. Reconnecting in 3s...');
      setTimeout(connect, 3000);
    };

    ws.onerror = err => console.error('[WS] Error', err);
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);
}

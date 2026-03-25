/**
 * WebSocket server for pushing real-time updates to the frontend.
 * Messages are JSON: { type: string, payload: any }
 */
const WebSocket = require('ws');

let wss = null;

function createWsServer(httpServer) {
  wss = new WebSocket.Server({ server: httpServer, path: '/ws' });

  wss.on('connection', ws => {
    console.log('[WSServer] Client connected');
    ws.send(JSON.stringify({ type: 'connected', payload: { ts: Date.now() } }));

    ws.on('error', err => console.error('[WSServer] Client error:', err.message));
    ws.on('close', () => console.log('[WSServer] Client disconnected'));
  });

  wss.on('error', err => console.error('[WSServer] Error:', err.message));

  return wss;
}

function broadcast(message) {
  if (!wss) return;
  const raw = typeof message === 'string' ? message : JSON.stringify(message);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(raw);
    }
  });
}

module.exports = { createWsServer, broadcast };

/**
 * WebSocket server for pushing real-time updates to the frontend.
 * Messages are JSON: { type: string, payload: any }
 *
 * Clients must authenticate by sending: { type: 'auth', token: '<jwt>' }
 * After auth, the connection is associated with a userId.
 */
const WebSocket = require('ws');
const { verifyToken } = require('./services/auth');

let wss = null;

// Map userId -> Set<WebSocket>
const userConnections = new Map();

function createWsServer(httpServer) {
  wss = new WebSocket.Server({ server: httpServer, path: '/ws' });

  wss.on('connection', ws => {
    console.log('[WSServer] Client connected (pending auth)');

    ws.userId = null;
    ws.authenticated = false;

    ws.send(JSON.stringify({ type: 'connected', payload: { ts: Date.now() } }));

    ws.on('message', raw => {
      try {
        const msg = JSON.parse(raw);

        if (msg.type === 'auth' && msg.token) {
          try {
            const payload = verifyToken(msg.token);
            ws.userId = payload.userId;
            ws.authenticated = true;

            // Register connection for this user
            if (!userConnections.has(ws.userId)) {
              userConnections.set(ws.userId, new Set());
            }
            userConnections.get(ws.userId).add(ws);

            console.log(`[WSServer] User ${ws.userId} authenticated via WS`);
            ws.send(JSON.stringify({ type: 'auth_ok', payload: { userId: ws.userId } }));
          } catch {
            ws.send(JSON.stringify({ type: 'auth_error', payload: { error: 'Invalid or expired token' } }));
          }
        }
        // Other message types can be handled here in the future
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on('error', err => console.error('[WSServer] Client error:', err.message));

    ws.on('close', () => {
      console.log(`[WSServer] Client disconnected (userId=${ws.userId || 'unauthenticated'})`);
      if (ws.userId && userConnections.has(ws.userId)) {
        userConnections.get(ws.userId).delete(ws);
        if (userConnections.get(ws.userId).size === 0) {
          userConnections.delete(ws.userId);
        }
      }
    });
  });

  wss.on('error', err => console.error('[WSServer] Error:', err.message));

  return wss;
}

/**
 * Broadcast to ALL connected clients (used by screener and global events).
 */
function broadcast(message) {
  if (!wss) return;
  const raw = typeof message === 'string' ? message : JSON.stringify(message);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(raw);
    }
  });
}

/**
 * Broadcast to a specific user's WS connections only.
 */
function broadcastToUser(userId, message) {
  if (!userId) return;
  const connections = userConnections.get(userId);
  if (!connections || connections.size === 0) return;

  const raw = typeof message === 'string' ? message : JSON.stringify(message);
  connections.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      try { ws.send(raw); } catch {}
    }
  });
}

/**
 * Create a broadcast function scoped to a specific user.
 * Used by per-user session services.
 */
function createUserBroadcast(userId) {
  return (message) => broadcastToUser(userId, message);
}

module.exports = { createWsServer, broadcast, broadcastToUser, createUserBroadcast };

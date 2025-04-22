import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./auth";
import { WebSocket, WebSocketServer } from 'ws';

// WebSocket connections map
export const wsConnections = new Map<number, Set<WebSocket>>();

const app = express();

// Setup middleware first
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Setup authentication after middleware but before routes
setupAuth(app);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Register API routes first
  const server = registerRoutes(app);
  
  // Setup WebSocket server with a specific path to avoid conflicts with Vite's WebSocket
  const wss = new WebSocketServer({ 
    server,
    path: '/api/ws'
  });
  
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    // Handle session subscription messages
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'subscribe' && data.sessionId) {
          const sessionId = parseInt(data.sessionId);
          
          if (!wsConnections.has(sessionId)) {
            wsConnections.set(sessionId, new Set());
          }
          
          // Add this connection to the session's subscribers
          wsConnections.get(sessionId)?.add(ws);
          console.log(`Client subscribed to session ${sessionId}`);
          
          // Send confirmation
          ws.send(JSON.stringify({ 
            type: 'subscribed', 
            sessionId 
          }));
        }
      } catch (err) {
        console.error('Error processing WebSocket message:', err);
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      // Remove this connection from all sessions
      wsConnections.forEach((connections, sessionId) => {
        connections.delete(ws);
        if (connections.size === 0) {
          wsConnections.delete(sessionId);
        }
      });
    });
  });

  // API error handling middleware
  app.use("/api", (err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('API Error:', err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  // Setup Vite or static file serving AFTER API routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = 5000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`serving on port ${PORT}`);
  });
})();
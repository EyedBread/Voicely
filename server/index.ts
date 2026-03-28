import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { config, validateConfig, isConfigured } from "./config";
import twilioWebhooks from "./twilio/webhooks";
import { callManager } from "./callManager";
import type { BridgeServerStatus } from "../shared/types";

const startTime = Date.now();

const app = express();

// Parse request bodies for Twilio webhooks
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// CORS for Next.js dashboard
app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (_req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

// Mount Twilio webhook routes
app.use(twilioWebhooks);

// Status endpoint for the dashboard
app.get("/status", (_req, res) => {
  const services = isConfigured();
  const status: BridgeServerStatus = {
    activeCalls: callManager.getCallCount(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    configuredServices: services,
  };
  res.json(status);
});

// Create HTTP server and WebSocket server
const server = createServer(app);

const wss = new WebSocketServer({ server, path: "/media-stream" });

wss.on("connection", (ws) => {
  console.log("[Bridge] New WebSocket connection on /media-stream");
  const orchestrator = callManager.handleNewCall(ws);

  orchestrator.on("error", (err) => {
    console.error(`[Bridge] Call error: ${err.message}`);
  });
});

// Start the server
const { port, host } = config.server;

server.listen(port, host, () => {
  console.log(`\n========================================`);
  console.log(`  Voisli Bridge Server`);
  console.log(`  Listening on http://${host}:${port}`);
  console.log(`========================================`);

  validateConfig();

  const services = isConfigured();
  console.log(`\n  Services:`);
  console.log(`    Twilio:    ${services.twilio ? "✓ configured" : "✗ not configured"}`);
  console.log(`    Gemini:    ${services.gemini ? "✓ configured" : "✗ not configured"}`);
  console.log(`    Calendar:  ${services.googleCalendar ? "✓ configured" : "✗ not configured"}`);

  if (config.server.publicUrl && !config.server.publicUrl.startsWith("https://your-")) {
    console.log(`\n  Public URL: ${config.server.publicUrl}`);
    console.log(`  TwiML webhook: ${config.server.publicUrl}/twiml`);
  } else {
    console.log(`\n  ⚠ No PUBLIC_SERVER_URL set — configure ngrok for Twilio webhooks`);
  }

  console.log(`\n  Status API: http://${host}:${port}/status`);
  console.log(`  WebSocket:  ws://${host}:${port}/media-stream`);
  console.log(``);
});

// Graceful shutdown
function shutdown(signal: string) {
  console.log(`\n[Bridge] Received ${signal}, shutting down...`);
  callManager.closeAll();
  wss.close(() => {
    server.close(() => {
      console.log("[Bridge] Server closed");
      process.exit(0);
    });
  });
  // Force exit after 5 seconds if graceful shutdown hangs
  setTimeout(() => {
    console.error("[Bridge] Forced shutdown after timeout");
    process.exit(1);
  }, 5000);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

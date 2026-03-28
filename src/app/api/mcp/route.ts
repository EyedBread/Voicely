import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { registerTools } from "../../../../server/mcp/tools.js";
import { registerResources } from "../../../../server/mcp/resources.js";
import type { BridgeAPIFn, BridgeResponse } from "../../../../server/mcp/bridge.js";

export const dynamic = "force-dynamic";

const BRIDGE_SERVER_URL =
  process.env.BRIDGE_SERVER_URL ?? "http://localhost:8080";
const MCP_API_KEY = process.env.MCP_API_KEY;

function createBridgeClient(bridgeUrl: string): BridgeAPIFn {
  return async function callBridgeAPI<T = unknown>(
    method: "GET" | "POST" | "DELETE",
    path: string,
    body?: Record<string, unknown>
  ): Promise<BridgeResponse<T>> {
    const url = `${bridgeUrl}${path}`;
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = (await res.json().catch(() => null)) as T;
      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unknown error connecting to bridge";
      return {
        ok: false,
        status: 0,
        data: {
          error: `Bridge server unreachable at ${bridgeUrl}: ${message}`,
        } as T,
      };
    }
  };
}

function createServer(): McpServer {
  const server = new McpServer({ name: "voisli", version: "0.1.0" });
  const bridge = createBridgeClient(BRIDGE_SERVER_URL);
  registerTools(server, bridge);
  registerResources(server, bridge);
  return server;
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version",
    "Access-Control-Expose-Headers": "Mcp-Session-Id",
  };
}

function unauthorized(message: string): Response {
  return Response.json({ error: message }, { status: 401, headers: corsHeaders() });
}

function validateAuth(request: Request): boolean {
  if (!MCP_API_KEY) return true; // no key configured = open (dev mode)
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  return authHeader.slice(7) === MCP_API_KEY;
}

export async function POST(request: Request): Promise<Response> {
  if (!validateAuth(request)) {
    return unauthorized("Invalid or missing API key");
  }

  const server = createServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
    enableJsonResponse: true, // JSON instead of SSE for serverless
  });

  await server.connect(transport);

  try {
    const response = await transport.handleRequest(request);

    // Add CORS headers to the response
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders())) {
      headers.set(key, value);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } finally {
    await transport.close();
    await server.close();
  }
}

export async function GET(): Promise<Response> {
  return Response.json(
    {
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed. Use POST for MCP requests." },
      id: null,
    },
    { status: 405, headers: { ...corsHeaders(), Allow: "POST" } }
  );
}

export async function DELETE(): Promise<Response> {
  // Stateless mode — no sessions to delete
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

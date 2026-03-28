"use client";

import { useState, useEffect, useCallback } from "react";

const BRIDGE_URL =
  process.env.NEXT_PUBLIC_BRIDGE_SERVER_URL || "http://localhost:8080";

interface SetupWizardProps {
  userId: number;
  onComplete: () => void;
}

const MCP_URL =
  process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/mcp`
    : `${typeof window !== "undefined" ? window.location.origin : ""}/api/mcp`;

const STEPS = [
  { label: "Claude", icon: "claude" },
  { label: "Gemini", icon: "ai" },
  { label: "Calendar", icon: "calendar" },
] as const;

export function SetupWizard({ userId, onComplete }: SetupWizardProps) {
  const [step, setStep] = useState(0);

  function next() {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      onComplete();
    }
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function skip() {
    onComplete();
  }

  return (
    <div className="flex min-h-[calc(100dvh-65px)] flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-muted">
              Setup {step + 1} of {STEPS.length}
            </h2>
            <button
              onClick={skip}
              className="text-xs text-muted hover:text-foreground transition-colors"
            >
              Skip setup
            </button>
          </div>
          <div className="flex gap-2">
            {STEPS.map((s, i) => (
              <div key={s.label} className="flex-1">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i < step
                      ? "bg-success"
                      : i === step
                        ? "bg-accent"
                        : "bg-card-border"
                  }`}
                />
                <p
                  className={`mt-1.5 text-xs font-medium ${
                    i <= step ? "text-foreground" : "text-muted/40"
                  }`}
                >
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div key={step} className="animate-step-enter">
          {step === 0 && <StepMCP />}
          {step === 1 && <StepGemini />}
          {step === 2 && <StepCalendar userId={userId} />}
        </div>

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          <div>
            {step > 0 && (
              <button
                onClick={back}
                className="text-sm text-muted hover:text-foreground transition-colors"
              >
                Back
              </button>
            )}
          </div>
          <button
            onClick={next}
            className="rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-accent-light hover:scale-105 active:scale-95"
          >
            {step < STEPS.length - 1 ? "Continue" : "Finish Setup"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Step 0: Connect Claude ─── */
function StepMCP() {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showDesktop, setShowDesktop] = useState(false);

  const mcpUrl = MCP_URL;

  const desktopConfig = JSON.stringify(
    {
      mcpServers: {
        voisli: {
          command: "npx",
          args: ["tsx", "server/mcp/index.ts"],
          cwd: "/path/to/voisli",
          env: {
            BRIDGE_SERVER_URL: BRIDGE_URL,
          },
        },
      },
    },
    null,
    2
  );

  function handleOpenClaude() {
    navigator.clipboard.writeText(mcpUrl).then(() => {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 4000);
      window.open("https://claude.ai", "_blank");
    });
  }

  function handleCopyUrl() {
    navigator.clipboard.writeText(mcpUrl).then(() => {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    });
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-6 w-6 text-accent"
          >
            <path
              fillRule="evenodd"
              d="M14.447 3.027a.75.75 0 01.527.92l-4.5 16.5a.75.75 0 01-1.448-.394l4.5-16.5a.75.75 0 01.921-.526zM16.72 6.22a.75.75 0 011.06 0l5.25 5.25a.75.75 0 010 1.06l-5.25 5.25a.75.75 0 11-1.06-1.06L21.44 12l-4.72-4.72a.75.75 0 010-1.06zm-9.44 0a.75.75 0 010 1.06L2.56 12l4.72 4.72a.75.75 0 11-1.06 1.06L.97 12.53a.75.75 0 010-1.06l5.25-5.25a.75.75 0 011.06 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Connect Claude
          </h2>
          <p className="text-sm text-muted">
            Let Claude control calls, meetings, and your calendar
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {/* Claude Mobile / Web — Primary */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Add Yapper to Claude
          </h3>

          <button
            onClick={handleOpenClaude}
            className="w-full rounded-xl bg-accent px-6 py-3.5 text-sm font-medium text-white transition-all hover:bg-accent-light hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5"
            >
              <path
                fillRule="evenodd"
                d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z"
                clipRule="evenodd"
              />
              <path
                fillRule="evenodd"
                d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z"
                clipRule="evenodd"
              />
            </svg>
            {copiedUrl ? "URL Copied — Opening Claude..." : "Open Claude & Copy URL"}
          </button>

          {copiedUrl && (
            <p className="mt-3 text-center text-xs text-success animate-step-enter">
              Go to Settings &rarr; Integrations &rarr; Add MCP Server &rarr; Paste
            </p>
          )}

          <div className="mt-4 pt-4 border-t border-card-border">
            <p className="text-xs text-muted mb-2">Or copy the URL manually:</p>
            <div className="relative">
              <button
                onClick={handleCopyUrl}
                className="absolute right-3 top-2.5 rounded-lg bg-background/80 px-2.5 py-1 text-xs font-medium text-muted hover:text-foreground transition-colors"
              >
                {copiedUrl ? "Copied!" : "Copy"}
              </button>
              <div className="rounded-xl border border-card-border bg-sidebar-bg px-4 py-3 font-mono text-xs text-accent-light break-all pr-20">
                {mcpUrl}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
          <div className="flex items-start gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5 shrink-0 text-accent"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-xs text-accent leading-relaxed">
              Once connected, you can ask Claude things like{" "}
              <span className="font-medium">&quot;Call +1555123456 and ask about their business hours&quot;</span>{" "}
              or{" "}
              <span className="font-medium">&quot;Join my Zoom meeting and take notes&quot;</span>.
            </p>
          </div>
        </div>

        {/* Claude Desktop / Code — Collapsible */}
        <div className="rounded-xl border border-card-border">
          <button
            onClick={() => setShowDesktop(!showDesktop)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-muted hover:text-foreground transition-colors"
          >
            <span>Using Claude Desktop or Claude Code instead?</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`h-4 w-4 transition-transform ${showDesktop ? "rotate-180" : ""}`}
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          {showDesktop && (
            <div className="border-t border-card-border px-4 py-4 space-y-3 animate-step-enter">
              <p className="text-xs text-muted">
                Paste this into your{" "}
                <code className="rounded bg-sidebar-bg px-1.5 py-0.5 font-mono text-accent-light">
                  claude_desktop_config.json
                </code>{" "}
                or{" "}
                <code className="rounded bg-sidebar-bg px-1.5 py-0.5 font-mono text-accent-light">
                  .mcp.json
                </code>{" "}
                file:
              </p>
              <pre className="overflow-x-auto rounded-xl border border-card-border bg-sidebar-bg p-4 font-mono text-xs text-foreground leading-relaxed">
                {desktopConfig}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Step 1: Gemini API ─── */
function StepGemini() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success/15">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-6 w-6 text-success"
          >
            <path d="M16.5 7.5h-9v9h9v-9z" />
            <path
              fillRule="evenodd"
              d="M8.25 2.25A.75.75 0 019 3v.75h2.25V3a.75.75 0 011.5 0v.75H15V3a.75.75 0 011.5 0v.75h.75a3 3 0 013 3v.75H21A.75.75 0 0121 9h-.75v2.25H21a.75.75 0 010 1.5h-.75V15H21a.75.75 0 010 1.5h-.75v.75a3 3 0 01-3 3h-.75V21a.75.75 0 01-1.5 0v-.75h-2.25V21a.75.75 0 01-1.5 0v-.75H9V21a.75.75 0 01-1.5 0v-.75h-.75a3 3 0 01-3-3v-.75H3A.75.75 0 013 15h.75v-2.25H3a.75.75 0 010-1.5h.75V9H3a.75.75 0 010-1.5h.75v-.75a3 3 0 013-3h.75V3a.75.75 0 01.75-.75zM6 6.75A.75.75 0 016.75 6h10.5a.75.75 0 01.75.75v10.5a.75.75 0 01-.75.75H6.75a.75.75 0 01-.75-.75V6.75z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Google Gemini API
          </h2>
          <p className="text-sm text-muted">
            Powers the AI voice on phone calls
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="glass-card rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Get your API key
          </h3>
          <ol className="space-y-3 text-sm text-muted">
            <SetupStep n={1}>
              Go to{" "}
              <span className="font-medium text-foreground">
                Google AI Studio
              </span>{" "}
              (aistudio.google.com)
            </SetupStep>
            <SetupStep n={2}>
              Click{" "}
              <span className="font-medium text-foreground">Get API Key</span>{" "}
              &rarr;{" "}
              <span className="font-medium text-foreground">
                Create API key
              </span>
            </SetupStep>
            <SetupStep n={3}>Copy the generated key</SetupStep>
          </ol>
        </div>

        <div className="glass-card rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Add to your .env
          </h3>
          <div className="rounded-xl border border-card-border bg-sidebar-bg p-4 font-mono text-xs text-foreground">
            GEMINI_API_KEY=your_api_key_here
          </div>
          <p className="mt-2 text-xs text-muted">
            Then restart the bridge server for changes to take effect.
          </p>
        </div>

        <div className="rounded-xl border border-success/20 bg-success/5 p-4">
          <div className="flex items-start gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5 shrink-0 text-success"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-xs text-success leading-relaxed">
              Gemini powers the real-time voice conversations on phone calls. The
              free tier is generous for development, but you&apos;ll want a paid plan
              for production use.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Step 2: Google Calendar ─── */
function StepCalendar({ userId }: { userId: number }) {
  const [connected, setConnected] = useState(false);
  const [oauthConfigured, setOauthConfigured] = useState(true);
  const [checking, setChecking] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(
        `${BRIDGE_URL}/auth/google/calendar/status?userId=${userId}`
      );
      if (res.ok) {
        const data = await res.json();
        setConnected(data.connected);
        setOauthConfigured(data.oauthConfigured);
      }
    } catch {
      // Bridge not reachable — leave defaults
    } finally {
      setChecking(false);
    }
  }, [userId]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Listen for the OAuth popup callback
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (
        event.data?.type === "google-calendar-connected" &&
        String(event.data.userId) === String(userId)
      ) {
        setConnected(true);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [userId]);

  function handleConnect() {
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    window.open(
      `${BRIDGE_URL}/auth/google/calendar?userId=${userId}`,
      "google-calendar-oauth",
      `width=${width},height=${height},left=${left},top=${top}`
    );
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await fetch(`${BRIDGE_URL}/auth/google/calendar/disconnect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      setConnected(false);
    } catch {
      // ignore
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-warning/15">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-6 w-6 text-warning"
          >
            <path
              fillRule="evenodd"
              d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0118 3v1.5h.75a3 3 0 013 3v11.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V7.5a3 3 0 013-3H6V3a.75.75 0 01.75-.75zm13.5 9a1.5 1.5 0 00-1.5-1.5H5.25a1.5 1.5 0 00-1.5 1.5v7.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-7.5z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Google Calendar
          </h2>
          <p className="text-sm text-muted">
            Let your AI check availability and create events
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {/* Connect / Connected state */}
        <div className="glass-card rounded-xl p-5">
          {checking ? (
            <div className="flex items-center gap-3 py-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              <span className="text-sm text-muted">
                Checking calendar connection...
              </span>
            </div>
          ) : connected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/20">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-5 w-5 text-success"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Google Calendar connected
                  </p>
                  <p className="text-xs text-muted">
                    Your AI can now check availability and create events
                  </p>
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="text-xs text-danger hover:text-danger/80 transition-colors disabled:opacity-50"
              >
                {disconnecting ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
          ) : oauthConfigured ? (
            <div className="space-y-4">
              <p className="text-sm text-muted">
                Connect your Google Calendar so your AI assistant can check your
                availability and schedule events on your behalf.
              </p>
              <button
                onClick={handleConnect}
                className="flex items-center gap-3 rounded-xl border border-card-border bg-sidebar-bg px-5 py-3 text-sm font-medium text-foreground transition-all hover:bg-card-border/50 hover:scale-[1.02] active:scale-[0.98]"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Connect Google Calendar
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted">
                Google OAuth is not configured on the server. Set{" "}
                <code className="rounded bg-sidebar-bg px-1.5 py-0.5 font-mono text-xs text-accent-light">
                  GOOGLE_CLIENT_ID
                </code>{" "}
                and{" "}
                <code className="rounded bg-sidebar-bg px-1.5 py-0.5 font-mono text-xs text-accent-light">
                  GOOGLE_CLIENT_SECRET
                </code>{" "}
                in your{" "}
                <code className="rounded bg-sidebar-bg px-1.5 py-0.5 font-mono text-xs text-accent-light">
                  .env
                </code>{" "}
                file to enable the Connect button.
              </p>
            </div>
          )}
        </div>

        {/* What it does */}
        {!connected && (
          <div className="glass-card rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              What your AI can do with Calendar
            </h3>
            <ul className="space-y-2 text-sm text-muted">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-success">&#10003;</span>
                <span>
                  Check your availability before scheduling calls or meetings
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-success">&#10003;</span>
                <span>Create events directly from phone conversations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-success">&#10003;</span>
                <span>List upcoming events to provide context during calls</span>
              </li>
            </ul>
          </div>
        )}

        <div className="rounded-xl border border-warning/20 bg-warning/5 p-4">
          <div className="flex items-start gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5 shrink-0 text-warning"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-xs text-warning leading-relaxed">
              Calendar integration is optional. You can skip this step and
              connect later from Settings. Your AI will still be able to make
              calls and join meetings without it.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Shared step component ─── */
function SetupStep({
  n,
  children,
}: {
  n: number;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-accent/10 text-[10px] font-bold text-accent">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}

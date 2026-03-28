import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-5 w-5 text-white"
            >
              <path
                fillRule="evenodd"
                d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight">Voisli</span>
        </div>
        <div />
      </nav>

      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mx-auto max-w-2xl space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-card-border/60 bg-card/60 px-4 py-1.5 text-sm text-muted backdrop-blur-sm">
            <span className="inline-block h-2 w-2 animate-pulse-dot rounded-full bg-success" />
            Powered by Gemini Live
          </div>

          <h1 className="text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
            Your AI
            <br />
            <span className="text-accent-light">Voice Assistant</span>
          </h1>

          <p className="mx-auto max-w-md text-lg leading-relaxed text-muted">
            Voisli answers calls, joins meetings, and takes action so you never
            miss what matters.
          </p>

          <div className="flex items-center justify-center gap-4 pt-2">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:bg-accent-light active:scale-[0.98]"
            >
              Get Started
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path
                  fillRule="evenodd"
                  d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                  clipRule="evenodd"
                />
              </svg>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center rounded-lg border border-card-border px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-card/80"
            >
              Login
            </Link>
          </div>
        </div>

        <div className="mt-24 grid w-full max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="glass-card rounded-xl p-6 text-left">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5 text-accent-light"
              >
                <path
                  fillRule="evenodd"
                  d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h3 className="mb-1 font-semibold">Smart Calls</h3>
            <p className="text-sm leading-relaxed text-muted">
              AI answers and handles inbound calls with natural conversation.
            </p>
          </div>

          <div className="glass-card rounded-xl p-6 text-left">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5 text-accent-light"
              >
                <path d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" />
              </svg>
            </div>
            <h3 className="mb-1 font-semibold">Meeting Notes</h3>
            <p className="text-sm leading-relaxed text-muted">
              Joins meetings, records transcripts, and summarizes key points.
            </p>
          </div>

          <div className="glass-card rounded-xl p-6 text-left">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5 text-accent-light"
              >
                <path
                  fillRule="evenodd"
                  d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h3 className="mb-1 font-semibold">Integrations</h3>
            <p className="text-sm leading-relaxed text-muted">
              Connects with Twilio, Google Calendar, and more out of the box.
            </p>
          </div>
        </div>
      </main>

      <footer className="px-6 py-8 text-center text-sm text-muted">
        Voisli &mdash; AI Voice Assistant
      </footer>
    </div>
  );
}

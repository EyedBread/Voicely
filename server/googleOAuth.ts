import { Router, type Request, type Response } from "express";
import { google } from "googleapis";
import { config } from "./config.js";
import db from "./db.js";

const router = Router();

const SCOPES = ["https://www.googleapis.com/auth/calendar"];

function getOAuth2Client() {
  const redirectUri = `${config.server.publicUrl || `http://localhost:${config.server.port}`}/auth/google/calendar/callback`;
  return new google.auth.OAuth2(
    config.googleOAuth.clientId,
    config.googleOAuth.clientSecret,
    redirectUri
  );
}

function isOAuthConfigured(): boolean {
  return !!(
    config.googleOAuth.clientId &&
    !config.googleOAuth.clientId.startsWith("your_") &&
    config.googleOAuth.clientSecret &&
    !config.googleOAuth.clientSecret.startsWith("your_")
  );
}

// GET /auth/google/calendar?userId=X — start OAuth flow
router.get("/auth/google/calendar", (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!userId) {
    res.status(400).json({ error: "userId query parameter is required" });
    return;
  }

  if (!isOAuthConfigured()) {
    res
      .status(503)
      .json({ error: "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." });
    return;
  }

  const oauth2Client = getOAuth2Client();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
    state: userId,
  });

  res.redirect(authUrl);
});

// GET /auth/google/calendar/callback — handle Google redirect
router.get(
  "/auth/google/calendar/callback",
  async (req: Request, res: Response) => {
    const code = req.query.code as string;
    const userId = req.query.state as string;

    if (!code || !userId) {
      res.status(400).send("Missing code or state parameter");
      return;
    }

    try {
      const oauth2Client = getOAuth2Client();
      const { tokens } = await oauth2Client.getToken(code);

      if (!tokens.access_token || !tokens.refresh_token) {
        res.status(400).send("Failed to obtain tokens from Google");
        return;
      }

      // Upsert tokens for this user
      db.prepare(
        `INSERT INTO google_calendar_tokens (user_id, access_token, refresh_token, expiry_date, scope, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(user_id) DO UPDATE SET
           access_token = excluded.access_token,
           refresh_token = excluded.refresh_token,
           expiry_date = excluded.expiry_date,
           scope = excluded.scope,
           updated_at = datetime('now')`
      ).run(
        userId,
        tokens.access_token,
        tokens.refresh_token,
        tokens.expiry_date ?? 0,
        tokens.scope ?? SCOPES.join(" ")
      );

      // Return a small HTML page that notifies the opener window and closes itself
      res.send(`<!DOCTYPE html>
<html>
<head><title>Calendar Connected</title></head>
<body>
  <p>Google Calendar connected successfully. This window will close.</p>
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: "google-calendar-connected", userId: ${JSON.stringify(userId)} }, "*");
    }
    setTimeout(() => window.close(), 1500);
  </script>
</body>
</html>`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[GoogleOAuth] Token exchange failed: ${message}`);
      res.status(500).send(`OAuth failed: ${message}`);
    }
  }
);

// GET /auth/google/calendar/status?userId=X — check if user has connected
router.get("/auth/google/calendar/status", (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  const row = db
    .prepare("SELECT user_id, scope, updated_at FROM google_calendar_tokens WHERE user_id = ?")
    .get(userId) as { user_id: number; scope: string; updated_at: string } | undefined;

  res.json({
    connected: !!row,
    oauthConfigured: isOAuthConfigured(),
    ...(row && { connectedAt: row.updated_at }),
  });
});

// POST /auth/google/calendar/disconnect — remove stored tokens
router.post(
  "/auth/google/calendar/disconnect",
  (req: Request, res: Response) => {
    const userId = (req.body as { userId?: string })?.userId ?? (req.query.userId as string);
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    db.prepare("DELETE FROM google_calendar_tokens WHERE user_id = ?").run(
      userId
    );
    res.json({ success: true });
  }
);

// ---------------------------------------------------------------------------
// Helper: get an authenticated OAuth2 client for a specific user.
// Returns null if the user has no stored tokens.
// ---------------------------------------------------------------------------
export function getUserCalendarAuth(userId: number) {
  const row = db
    .prepare(
      "SELECT access_token, refresh_token, expiry_date, scope FROM google_calendar_tokens WHERE user_id = ?"
    )
    .get(userId) as
    | {
        access_token: string;
        refresh_token: string;
        expiry_date: number;
        scope: string;
      }
    | undefined;

  if (!row) return null;

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: row.access_token,
    refresh_token: row.refresh_token,
    expiry_date: row.expiry_date,
  });

  // When the token refreshes, persist the new access token
  oauth2Client.on("tokens", (tokens) => {
    if (tokens.access_token) {
      db.prepare(
        `UPDATE google_calendar_tokens
         SET access_token = ?, expiry_date = ?, updated_at = datetime('now')
         WHERE user_id = ?`
      ).run(tokens.access_token, tokens.expiry_date ?? 0, userId);
    }
  });

  return oauth2Client;
}

export default router;

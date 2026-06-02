import jwt from "jsonwebtoken";
import SuppressedEmail from "../model/suppressedEmail.model.js";
import { ENV } from "../config/env.js";

// ─── GET /unsubscribe?token=... ───────────────────────────────
// Verifies the JWT, saves to suppression list, returns confirmation HTML.

export const handleUnsubscribe = async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send(renderPage("Invalid Link", "No unsubscribe token was provided.", false));
  }

  let payload;
  try {
    payload = jwt.verify(token, ENV.UNSUBSCRIBE_JWT_SECRET);
  } catch (err) {
    const msg =
      err.name === "TokenExpiredError"
        ? "This unsubscribe link has expired. Please contact support."
        : "This unsubscribe link is invalid or has been tampered with.";
    return res.status(400).send(renderPage("Invalid Link", msg, false));
  }

  const { email, campaignId } = payload;

  // Check if already unsubscribed
  const existing = await SuppressedEmail.findOne({ email });
  if (existing) {
    return res.send(
      renderPage(
        "Already Unsubscribed",
        `<strong>${email}</strong> is already unsubscribed. You will not receive any future emails from us.`,
        true
      )
    );
  }

  // Save to suppression list
  try {
    await SuppressedEmail.create({ email, campaignId });
  } catch (err) {
    // Race condition — another request already inserted it (unique index)
    if (err.code === 11000) {
      return res.send(
        renderPage(
          "Already Unsubscribed",
          `<strong>${email}</strong> is already unsubscribed.`,
          true
        )
      );
    }
    return res.status(500).send(renderPage("Error", "Something went wrong. Please try again later.", false));
  }

  return res.send(
    renderPage(
      "You've been unsubscribed",
      `<strong>${email}</strong> has been successfully removed from our mailing list. You will not receive any future emails from us.`,
      true
    )
  );
};

// ─── Confirmation page HTML ───────────────────────────────────

function renderPage(title, message, success) {
  const color = success ? "#22c55e" : "#ef4444";
  const icon = success ? "✓" : "✕";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f0f0f;
      color: #e5e5e5;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .card {
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 16px;
      padding: 48px 40px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 24px 48px rgba(0,0,0,0.4);
    }

    .icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: ${color}1a;
      border: 2px solid ${color};
      color: ${color};
      font-size: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }

    h1 {
      font-size: 22px;
      font-weight: 600;
      color: #f5f5f5;
      margin-bottom: 12px;
    }

    p {
      font-size: 15px;
      color: #a3a3a3;
      line-height: 1.6;
    }

    p strong {
      color: #e5e5e5;
      font-weight: 500;
    }

    .footer {
      margin-top: 32px;
      font-size: 13px;
      color: #525252;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <p class="footer">NoteHub &mdash; You can close this tab.</p>
  </div>
</body>
</html>`;
}
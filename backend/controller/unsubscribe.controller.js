import jwt from "jsonwebtoken";
import SuppressedEmail from "../model/suppressedEmail.model.js";
import { ENV } from "../config/env.js";

// ─── GET /unsubscribe?token=... ───────────────────────────────
export const handleUnsubscribe = async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res
      .status(400)
      .send(
        renderPage("Invalid Link", "No unsubscribe token was provided.", false),
      );
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

  const existing = await SuppressedEmail.findOne({ email });
  if (existing) {
    return res.send(
      renderPage(
        "Already Unsubscribed",
        `<strong>${email}</strong> is already unsubscribed. You will not receive any future emails from us.`,
        true,
      ),
    );
  }

  try {
    await SuppressedEmail.create({ email, campaignId });
  } catch (err) {
    if (err.code === 11000) {
      return res.send(
        renderPage(
          "Already Unsubscribed",
          `<strong>${email}</strong> is already unsubscribed.`,
          true,
        ),
      );
    }
    return res
      .status(500)
      .send(
        renderPage(
          "Error",
          "Something went wrong. Please try again later.",
          false,
        ),
      );
  }

  return res.send(
    renderPage(
      "You've been unsubscribed",
      `<strong>${email}</strong> has been successfully removed from our mailing list. You will not receive any future emails from us.`,
      true,
    ),
  );
};

// ─── GET /api/suppressed-emails ───────────────────────────────
export const getSuppressedEmails = async (req, res) => {
  try {
    const { campaign, page = 1, limit = 50 } = req.query;
    const filter = campaign ? { campaignId: campaign } : {};

    const [data, total] = await Promise.all([
      SuppressedEmail.find(filter)
        .sort({ createdAt: -1 })
        .skip((+page - 1) * +limit)
        .limit(+limit)
        .lean(),
      SuppressedEmail.countDocuments(filter),
    ]);

    return res.json({ data, total, page: +page, limit: +limit });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to fetch suppressed emails." });
  }
};

// ─── GET /api/suppressed-emails/:email ────────────────────────
export const getSuppressedEmailByEmail = async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const doc = await SuppressedEmail.findOne({ email }).lean();

    if (!doc)
      return res
        .status(404)
        .json({ error: "Email not found in suppression list." });
    return res.json(doc);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch email." });
  }
};

// ─── DELETE /api/suppressed-emails ────────────────────────────
// Body: { email } for single, { emails: [] } for bulk
export const deleteSuppressedEmail = async (req, res) => {
  try {
    const { email, emails } = req.body;

    if (emails?.length) {
      const { deletedCount } = await SuppressedEmail.deleteMany({
        email: { $in: emails },
      });
      return res.json({ deleted: deletedCount });
    }

    if (email) {
      const result = await SuppressedEmail.deleteOne({ email });
      if (!result.deletedCount)
        return res
          .status(404)
          .json({ error: "Email not found in suppression list." });
      return res.json({ deleted: 1 });
    }

    return res.status(400).json({ error: "Provide email or emails[]." });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to delete suppressed email." });
  }
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
  <title>${title} — NoteHub</title>
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
    .logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 32px;
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
    h1 { font-size: 22px; font-weight: 600; color: #f5f5f5; margin-bottom: 12px; }
    p { font-size: 15px; color: #a3a3a3; line-height: 1.6; }
    p strong { color: #e5e5e5; font-weight: 500; }
    .footer { margin-top: 32px; font-size: 13px; color: #525252; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <svg width="22" height="22" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g clip-path="url(#clip0)">
          <circle cx="64" cy="64" r="64" fill="black"/>
          <path opacity="0.5" d="M56.32 43.52C56.32 35.04 49.44 28.16 40.96 28.16C32.48 28.16 25.6 35.04 25.6 43.52V84.48C25.6 92.96 32.48 99.84 40.96 99.84C49.44 99.84 56.32 92.96 56.32 84.48V43.52Z" fill="#D9D9D9"/>
          <path d="M84.48 28.16C92.96 28.16 99.84 35.04 99.84 43.52V84.48C99.84 84.75 99.83 85.02 99.82 85.28C99.89 89.22 98.46 93.18 95.51 96.24C89.62 102.34 79.89 102.51 73.79 96.62L30.49 54.81C24.39 48.91 24.22 39.19 30.12 33.09C36.01 26.99 45.73 26.82 51.83 32.71L69.12 49.4V43.52C69.12 35.04 75.99 28.16 84.48 28.16Z" fill="#D9D9D9"/>
        </g>
        <defs><clipPath id="clip0"><rect width="128" height="128" fill="white"/></clipPath></defs>
      </svg>
      <svg height="10" viewBox="0 0 57 10" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8.39648 8.36133C8.39648 8.4707 8.375 8.57227 8.33203 8.66602C8.29297 8.75977 8.23828 8.8418 8.16797 8.91211C8.10156 8.97852 8.02148 9.03125 7.92773 9.07031C7.83398 9.10938 7.73438 9.12891 7.62891 9.12891C7.53516 9.12891 7.43945 9.11133 7.3418 9.07617C7.24805 9.04102 7.16406 8.98438 7.08984 8.90625L1.52344 3.09375V9.01172H0V1.25977C0 1.10352 0.0429688 0.962891 0.128906 0.837891C0.21875 0.708984 0.332031 0.613281 0.46875 0.550781C0.613281 0.492188 0.761719 0.478516 0.914062 0.509766C1.06641 0.537109 1.19727 0.607422 1.30664 0.720703L6.87305 6.52734V0.609375H8.39648V8.36133ZM16.8457 6.87305C16.8457 7.13477 16.8125 7.37109 16.7461 7.58203C16.6797 7.78906 16.5918 7.97266 16.4824 8.13281C16.373 8.28906 16.2461 8.42383 16.1016 8.53711C15.957 8.64648 15.8047 8.73633 15.6445 8.80664C15.4883 8.87695 15.3281 8.92969 15.1641 8.96484C15.0039 8.99609 14.8516 9.01172 14.707 9.01172H11.959C11.748 9.01172 11.5176 8.97461 11.2676 8.90039C11.0176 8.82617 10.7852 8.70508 10.5703 8.53711C10.3594 8.36523 10.1816 8.14453 10.0371 7.875C9.89648 7.60156 9.82617 7.26758 9.82617 6.87305V4.81055C9.82617 4.41992 9.89648 4.08984 10.0371 3.82031C10.1816 3.54688 10.3594 3.32617 10.5703 3.1582C10.7852 2.98633 11.0176 2.86328 11.2676 2.78906C11.5176 2.71484 11.748 2.67773 11.959 2.67773H14.707C15.0977 2.67773 15.4297 2.74805 15.7031 2.88867C15.9766 3.0293 16.1973 3.20703 16.3652 3.42188C16.5332 3.63281 16.6543 3.86328 16.7285 4.11328C16.8066 4.36328 16.8457 4.5957 16.8457 4.81055V6.87305ZM15.3223 4.82227C15.3223 4.61133 15.2695 4.45508 15.1641 4.35352C15.0586 4.25195 14.9062 4.20117 14.707 4.20117H11.9707C11.7676 4.20117 11.6133 4.25391 11.5078 4.35938C11.4023 4.46094 11.3496 4.61133 11.3496 4.81055V6.87305C11.3496 7.07227 11.4023 7.22461 11.5078 7.33008C11.6133 7.43555 11.7676 7.48828 11.9707 7.48828H14.707C14.9141 7.48828 15.0684 7.43555 15.1699 7.33008C15.2715 7.22461 15.3223 7.07227 15.3223 6.87305V4.82227ZM23.8711 4.20117H21.2109V9.01172H19.6699V4.20117H17.6895V2.67773H19.6699V0.609375H21.2109V2.67773H23.8711V4.20117ZM31.6641 4.77539C31.6641 4.98633 31.627 5.21484 31.5527 5.46094C31.4785 5.70312 31.3574 5.92969 31.1895 6.14062C31.0254 6.34766 30.8086 6.52148 30.5391 6.66211C30.2734 6.80273 29.9492 6.87305 29.5664 6.87305H26.8184V5.42578H29.5664C29.7734 5.42578 29.9336 5.36328 30.0469 5.23828C30.1602 5.10938 30.2168 4.95117 30.2168 4.76367C30.2168 4.56445 30.1523 4.4082 30.0234 4.29492C29.8984 4.18164 29.7461 4.125 29.5664 4.125H26.8184C26.6113 4.125 26.4512 4.18945 26.3379 4.31836C26.2246 4.44336 26.168 4.59961 26.168 4.78711V6.91406C26.168 7.11719 26.2305 7.27539 26.3555 7.38867C26.4844 7.50195 26.6426 7.55859 26.8301 7.55859H29.5664V9.01172H26.8184C26.6074 9.01172 26.3789 8.97461 26.1328 8.90039C25.8906 8.82617 25.6641 8.70703 25.4531 8.54297C25.2461 8.375 25.0723 8.1582 24.9316 7.89258C24.791 7.62305 24.7207 7.29688 24.7207 6.91406V4.77539C24.7207 4.56445 24.7578 4.33789 24.832 4.0957C24.9062 3.84961 25.0254 3.62305 25.1895 3.41602C25.3574 3.20508 25.5742 3.0293 25.8398 2.88867C26.1094 2.74805 26.4355 2.67773 26.8184 2.67773H29.5664C29.7773 2.67773 30.0039 2.71484 30.2461 2.78906C30.4922 2.86328 30.7188 2.98438 30.9258 3.15234C31.1367 3.31641 31.3125 3.5332 31.4531 3.80273C31.5938 4.06836 31.6641 4.39258 31.6641 4.77539ZM39.7324 9.01172H38.209V4.81055C38.209 4.61133 38.1582 4.46094 38.0566 4.35938C37.9551 4.25391 37.8027 4.20117 37.5996 4.20117H34.8516V2.67773H37.5996C37.7441 2.67773 37.8965 2.69531 38.0566 2.73047C38.2168 2.76172 38.375 2.8125 38.5312 2.88281C38.6914 2.95312 38.8438 3.04492 38.9883 3.1582C39.1328 3.26758 39.2598 3.40234 39.3691 3.5625C39.4785 3.71875 39.5664 3.90039 39.6328 4.10742C39.6992 4.31445 39.7324 4.54883 39.7324 4.81055V9.01172ZM34.2363 9.01172H32.7129V0H34.2363V9.01172ZM48.0527 8.24414C48.0527 8.35352 48.0332 8.45508 47.9941 8.54883C47.9551 8.64258 47.9004 8.72461 47.8301 8.79492C47.7637 8.86133 47.6836 8.91406 47.5898 8.95312C47.5 8.99219 47.4023 9.01172 47.2969 9.01172H43.8516C43.6641 9.01172 43.4629 8.99023 43.248 8.94727C43.0371 8.9043 42.8281 8.83594 42.6211 8.74219C42.4141 8.64453 42.2129 8.52344 42.0176 8.37891C41.8262 8.23047 41.6582 8.05273 41.5137 7.8457C41.3691 7.63477 41.252 7.39258 41.1621 7.11914C41.0762 6.8457 41.0332 6.53711 41.0332 6.19336V2.67773H42.5566V6.19336C42.5566 6.39258 42.5898 6.57227 42.6562 6.73242C42.7266 6.88867 42.8203 7.02344 42.9375 7.13672C43.0547 7.25 43.1914 7.33789 43.3477 7.40039C43.5078 7.45898 43.6797 7.48828 43.8633 7.48828H46.5293V2.67773H48.0527V8.24414ZM56.4668 6.87305C56.4668 7.01758 56.4492 7.16992 56.4141 7.33008C56.3828 7.49023 56.332 7.65039 56.2617 7.81055C56.1914 7.9668 56.0996 8.11719 55.9863 8.26172C55.877 8.40625 55.7422 8.53516 55.582 8.64844C55.4258 8.75781 55.2441 8.8457 55.0371 8.91211C54.8301 8.97852 54.5957 9.01172 54.334 9.01172H51.5859C51.4414 9.01172 51.2891 8.99609 51.1289 8.96484C50.9688 8.92969 50.8086 8.87695 50.6484 8.80664C50.4922 8.73633 50.3418 8.64648 50.1973 8.53711C50.0527 8.42383 49.9238 8.28906 49.8105 8.13281C49.7012 7.97266 49.6133 7.78906 49.5469 7.58203C49.4805 7.37109 49.4473 7.13477 49.4473 6.87305V0H50.9707V6.87305C50.9707 7.06055 51.0293 7.21094 51.1465 7.32422C51.2637 7.43359 51.4102 7.48828 51.5859 7.48828H54.334C54.5254 7.48828 54.6738 7.43164 54.7793 7.31836C54.8887 7.20508 54.9434 7.05664 54.9434 6.87305V4.81055C54.9434 4.61914 54.8867 4.4707 54.7734 4.36523C54.6602 4.25586 54.5137 4.20117 54.334 4.20117H51.5859V2.67773H54.334C54.4785 2.67773 54.6309 2.69531 54.791 2.73047C54.9512 2.76172 55.1094 2.8125 55.2656 2.88281C55.4258 2.95312 55.5781 3.04492 55.7227 3.1582C55.8672 3.26758 55.9941 3.40234 56.1035 3.5625C56.2129 3.71875 56.3008 3.90039 56.3672 4.10742C56.4336 4.31445 56.4668 4.54883 56.4668 4.81055V6.87305Z" fill="#D9D9D9"/>
      </svg>
    </div>
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <p class="footer">NoteHub &mdash; You can close this tab.</p>
  </div>
</body>
</html>`;
}

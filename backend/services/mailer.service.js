import { ENV } from "../config/env.js";

/**
 * Send a single email via Brevo
 */
export const sendBrevoEmail = async ({
  to,
  subject,
  html,
  previewText = "",
}) => {
  // Inject hidden preheader
  const finalHtml = previewText
    ? `
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">
${previewText}
</div>

<div style="display:none;max-height:0;overflow:hidden;">
&#8203;&#847;&zwnj;&nbsp;&#8199;&#65279;
</div>

${html}
`
    : html;

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": ENV.BREVO_API_KEY,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: "NoteHub", email: ENV.EMAIL_SENDER },
      to: [{ email: to }],
      subject,
      htmlContent: finalHtml,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Brevo send failed");
  return data;
};

/**
 * Build liquid context for a user
 */
export const buildContext = (user, extraJson = {}) => ({
  user: {
    fullName: user.fullName,
    userName: user.userName,
    email: user.email,
    avatar: user.avatar,
    bio: user.bio,
    skills: user.skills,
  },
  extra: extraJson,
});

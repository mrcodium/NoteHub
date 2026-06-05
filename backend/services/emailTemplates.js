// ─────────────────────────────────────────────────────────────────────────────
// utils/escapeHtml.js
// ─────────────────────────────────────────────────────────────────────────────
export const escapeHtml = (str = "") =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

// ─────────────────────────────────────────────────────────────────────────────
// OTP Template  (unchanged UI, just cleaned up)
// ─────────────────────────────────────────────────────────────────────────────
export const otpTemplate = ({ email, otpCode, expiresInMinutes, purpose }) => {
  const emailContent = {
    signup: {
      subjectLine: "Verify Your Email to Get Started with Notehub",
      actionText:
        "To complete your registration and start using Notehub, please verify your email address using the code below:",
      subHeading: "Verification Code",
      footerNote:
        "If you did not sign up for Notehub, you can safely ignore this email.",
    },
    password_reset: {
      subjectLine: "Reset Your Notehub Password",
      actionText:
        "To reset your password, please use the verification code below:",
      subHeading: "Password Reset Code",
      footerNote:
        "If you didn't request a password reset, please ignore this email or contact our support team.",
    },
    email_update: {
      subjectLine: "Confirm Your New Email for Notehub",
      actionText:
        "To update your email address for your Notehub account, please verify your new email using the code below:",
      subHeading: "Email Update Code",
      footerNote:
        "If you did not request this change, please contact our support immediately.",
    },
  };

  const { subjectLine, actionText, subHeading, footerNote } =
    emailContent[purpose] || emailContent.signup;

  const safeEmail = escapeHtml(email);
  const formattedOtp = otpCode.toString().replace(/(\d{3})(\d{3})/, "$1 $2");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${subjectLine}</title>
    <style>
        @media (prefers-color-scheme: dark) {
            body, table, td { background-color: #0a0a0a !important; color: #fafafa !important; }
        }
        [data-ogsc] .email-header { background-color: #fafafa !important; color: #a0a0a0 !important; }
        [data-ogsc] .otp-container { background-color: #121212 !important; border-color: #2e2f2f !important; }
        [data-ogsc] .email-footer { background-color: #0a0a0a !important; border-top-color: #2e2f2f !important; color: #fafafa !important; }
        [data-ogsc] .muted-text { color: #a1a1a1 !important; }
    </style>
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f5f5f5;color:#0a0a0a;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f5f5f5">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="margin:auto;background-color:#ffffff;" bgcolor="#ffffff">
                    <!-- Header -->
                    <tr>
                        <td style="padding:20px;text-align:center;background-color:#0a0a0a;color:#fafafa;" bgcolor="#0a0a0a" class="email-header">
                            <h1 style="margin:0;font-size:24px;">Notehub</h1>
                        </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                        <td style="padding:30px;color:#0a0a0a;">
                            <h2 style="margin:0 0 10px 0;font-size:18px;">Hello ${safeEmail},</h2>
                            <p style="margin-bottom:25px;line-height:1.5;">${actionText}</p>
                            <!-- OTP Block -->
                            <table width="100%" cellpadding="20" cellspacing="0" border="0" style="background-color:#f5f5f5;border-radius:8px;border:1px solid #e5e5e5;margin:25px 0;" bgcolor="#f5f5f5" class="otp-container">
                                <tr>
                                    <td style="text-align:center;">
                                        <p style="font-size:16px;color:#737373;margin-bottom:10px;font-weight:600;">${subHeading}</p>
                                        <p style="font-size:32px;font-weight:bold;letter-spacing:5px;margin:15px 0;">${formattedOtp}</p>
                                        <p style="font-size:13px;color:#737373;">This code will expire in ${expiresInMinutes} minutes.</p>
                                    </td>
                                </tr>
                            </table>
                            <p style="font-size:13px;color:#737373;">${footerNote}</p>
                            <p style="font-size:13px;margin-top:10px;">— The Notehub Team</p>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="padding:20px;text-align:center;background-color:#ffffff;border-top:1px solid #e5e5e5;color:#0a0a0a;" bgcolor="#ffffff" class="email-footer">
                            <table cellpadding="0" cellspacing="0" style="margin:15px auto;">
                                <tr>
                                    <td style="padding:0 8px;">
                                        <a href="https://www.linkedin.com/in/abhijeet-singh-rajput1/" target="_blank">
                                            <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" alt="LinkedIn" width="24" height="24" style="opacity:0.8;filter:grayscale(100%);" />
                                        </a>
                                    </td>
                                    <td style="padding:0 8px;">
                                        <a href="https://github.com/abhijeetSinghRajput" target="_blank">
                                            <img src="https://cdn-icons-png.flaticon.com/512/25/25231.png" alt="GitHub" width="24" height="24" style="opacity:0.8;filter:grayscale(100%);" />
                                        </a>
                                    </td>
                                    <td style="padding:0 8px;">
                                        <a href="https://www.instagram.com/abhijeet_singh_rajput1" target="_blank">
                                            <img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" alt="Instagram" width="24" height="24" style="opacity:0.8;filter:grayscale(100%);" />
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin:0;font-size:12px;">© 2025 Notehub. All rights reserved.</p>
                            <p style="margin:8px 0 0 0;font-size:11px;color:#737373;">Created by Abhijeet Singh Rajput</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Contact Template — Admin Notification
// ─────────────────────────────────────────────────────────────────────────────
export const contactTemplate = ({
  email,
  from_name,
  to_name = "Abhijeet",
  reason,
  subject,
  message,
  ip,
  userAgent,
  submittedAt,
}) => {
  // Escape all user-supplied values
  const safeFromName = escapeHtml(from_name);
  const safeToName = escapeHtml(to_name);
  const safeEmail = escapeHtml(email);
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");
  const safeIp = escapeHtml(ip || "N/A");
  const safeUserAgent = escapeHtml(userAgent || "N/A");

  const timestamp =
    submittedAt ||
    new Date().toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  const CONTACT_REASONS = {
    default: {
      label: "General Enquiry",
      icon: "https://img.icons8.com/?size=100&id=VhoPIeUVX2mw&format=png&color=808080",
    },
    general: {
      label: "General Enquiry",
      icon: "https://img.icons8.com/?size=100&id=VhoPIeUVX2mw&format=png&color=808080",
    },
    bug: {
      label: "Report a Bug",
      icon: "https://img.icons8.com/?size=100&id=9227&format=png&color=808080",
    },
    feature: {
      label: "Feature Request",
      icon: "https://img.icons8.com/?size=100&id=85887&format=png&color=808080",
    },
    content: {
      label: "Content / Notes",
      icon: "https://img.icons8.com/?size=100&id=fpAVFn3MN108&format=png&color=808080",
    },
    support: {
      label: "Account Support",
      icon: "https://img.icons8.com/?size=100&id=98973&format=png&color=808080",
    },
  };

  const { label: reason_label, icon: reason_icon } =
    CONTACT_REASONS[reason?.toLowerCase()] || CONTACT_REASONS["default"];

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Message from NoteHub</title>
    <style>
        @media screen and (max-width: 600px) {
            .header-title  { font-size: 20px !important; }
            .main-text     { font-size: 14px !important; }
            .message-text  { font-size: 14px !important; }
            .contact-label { font-size: 12px !important; }
            .contact-info  { font-size: 13px !important; }
            .footer-text   { font-size: 12px !important; }
            .copyright     { font-size: 11px !important; }
            .main-padding  { padding: 30px 20px !important; }
            .header-padding{ padding: 25px 20px !important; }
            .footer-padding{ padding: 25px 20px !important; }
            .logo-img      { width: 50px !important; height: 50px !important; }
        }
        @media screen and (max-width: 400px) {
            .header-title { font-size: 18px !important; }
            .main-text    { font-size: 13px !important; }
            .main-padding { padding: 25px 15px !important; }
            .header-padding { padding: 20px 15px !important; }
            .footer-padding { padding: 20px 15px !important; }
        }
    </style>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#0a0a0a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;">
    <tr>
        <td align="center" style="padding:40px 10px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#1a1a1a;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.5);">

                <!-- Header -->
                <tr>
                    <td class="header-padding" style="background:linear-gradient(135deg,#1e1e1e 0%,#2a2a2a 100%);padding:30px;text-align:center;border-bottom:2px solid #333;">
                        <img src="https://res.cloudinary.com/dhtxrpqna/image/upload/v1770061775/notehub_2_xgrpqt.png" alt="NoteHub Logo" class="logo-img" style="width:60px;height:60px;object-fit:cover;margin-bottom:15px;display:inline-block;border-radius:50%;">
                        <h1 class="header-title" style="margin:0;color:#ffffff;font-size:24px;font-weight:600;letter-spacing:-0.5px;">New Message Received</h1>
                    </td>
                </tr>

                <!-- Body -->
                <tr>
                    <td class="main-padding" style="padding:40px 30px;">

                        <p class="main-text" style="margin:0 0 20px;color:#e0e0e0;font-size:16px;line-height:1.6;">
                            Hello <strong style="color:#ffffff;">${safeToName}</strong>,
                        </p>
                        <p class="main-text" style="margin:0 0 25px;color:#e0e0e0;font-size:16px;line-height:1.6;">
                            You have received a new message from <strong style="color:#ffffff;">${safeFromName}</strong> through your NoteHub contact form:
                        </p>

                        <!-- Reason Category Card -->
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                            <tr>
                                <td style="background-color:#252525;border-radius:8px;padding:14px 20px;">

                                    <!-- Row 1: Icon + Reason -->
                                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:${safeSubject ? '12px' : '0'};">
                                        <tr>
                                            <td style="padding-right:12px;vertical-align:middle;">
                                                <img src="${reason_icon}" alt="${reason_label}" width="32" height="32" style="display:block;">
                                            </td>
                                            <td style="vertical-align:middle;">
                                                <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.8px;font-weight:600;">Reason</p>
                                                <p style="margin:2px 0 0;font-size:14px;color:#ffffff;font-weight:600;">${reason_label}</p>
                                            </td>
                                        </tr>
                                    </table>

                                    <!-- Row 2: Subject (conditional) -->
                                    ${safeSubject ? `
                                    <table role="presentation" cellpadding="0" cellspacing="0" style="border-top:1px solid #333;padding-top:12px;width:100%;">
                                        <tr>
                                            <td style="vertical-align:middle;">
                                                <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.8px;font-weight:600;">Subject</p>
                                                <p style="margin:2px 0 0;font-size:14px;color:#d0d0d0;">${safeSubject}</p>
                                            </td>
                                        </tr>
                                    </table>` : ""}

                                </td>
                            </tr>
                        </table>

                        <!-- Message Box -->
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 25px;">
                            <tr>
                                <td style="background-color:#252525;border-left:4px solid #ffdb70;border-radius:6px;padding:20px 24px;">
                                    <p class="message-text" style="margin:0;color:#d0d0d0;font-size:15px;line-height:1.7;font-style:italic;">${safeMessage}</p>
                                </td>
                            </tr>
                        </table>

                        <!-- Sender Info Box -->
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 25px;">
                            <tr>
                                <td style="background-color:#1e1e1e;border-radius:6px;padding:18px 24px;">
                                    <p class="contact-label" style="margin:0 0 8px;color:#999;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Contact Details</p>
                                    <p class="contact-info" style="margin:0;color:#e0e0e0;font-size:14px;line-height:1.8;">
                                        <strong style="color:#ffffff;">From:</strong> ${safeFromName}<br>
                                        <strong style="color:#ffffff;">Email:</strong> <a href="mailto:${safeEmail}" style="color:#ffdb70;text-decoration:none;">${safeEmail}</a><br>
                                        <strong style="color:#ffffff;">Received:</strong> ${timestamp}<br>
                                        <strong style="color:#ffffff;">IP:</strong> <span style="color:#737373;font-size:12px;">${safeIp}</span><br>
                                        <strong style="color:#ffffff;">Browser:</strong> <span style="color:#737373;font-size:12px;">${safeUserAgent}</span>
                                    </p>
                                </td>
                            </tr>
                        </table>

                        <!-- Reply CTA -->
                        <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                            <tr>
                                <td style="border-radius:10px;overflow:hidden;">
                                    <a href="mailto:${safeEmail}" style="display:inline-block;background:#fafafa;color:#0a0a0a;font-size:13px;font-weight:600;padding:12px 24px;border-radius:10px;text-decoration:none;letter-spacing:0.2px;">
                                        ↩&nbsp;&nbsp;Reply to ${safeFromName}
                                    </a>
                                </td>
                            </tr>
                        </table>

                        <p class="main-text" style="margin:0;color:#b0b0b0;font-size:14px;line-height:1.6;">
                            Reply directly to this email to get in touch with ${safeFromName}.
                        </p>
                    </td>
                </tr>

                <!-- Footer -->
                <tr>
                    <td class="footer-padding" style="background-color:#151515;padding:30px;border-top:1px solid #2a2a2a;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                                <td style="text-align:center;padding-bottom:15px;">
                                    <img src="https://res.cloudinary.com/dhtxrpqna/image/upload/v1780641475/abhijeet-signature_quitsi.png" alt="Signature" style="max-width:180px;height:auto;display:inline-block;">
                                </td>
                            </tr>
                            <tr>
                                <td style="text-align:center;">
                                    <p class="footer-text" style="margin:0;color:#666;font-size:13px;line-height:1.6;">
                                        This message was sent via your NoteHub contact form<br>
                                        <a href="https://notehub-official.vercel.app" style="color:#ffdb70;text-decoration:none;">notehub-official.vercel.app</a>
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

            </table>

            <!-- Copyright -->
            <p class="copyright" style="margin:20px 0 0;color:#555;font-size:12px;text-align:center;">
                © 2025 Abhijeet Singh Rajput. All rights reserved.
            </p>
        </td>
    </tr>
</table>
</body>
</html>`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Contact Confirmation Template — Sent to the User
// ─────────────────────────────────────────────────────────────────────────────
export const contactConfirmationTemplate = ({ from_name, reason, message }) => {
  const safeName = escapeHtml(from_name);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");

  const CONTACT_REASONS = {
    default: {
      label: "General Enquiry",
      icon: "https://img.icons8.com/?size=100&id=VhoPIeUVX2mw&format=png&color=808080",
    },
    general: {
      label: "General Enquiry",
      icon: "https://img.icons8.com/?size=100&id=VhoPIeUVX2mw&format=png&color=808080",
    },
    bug: {
      label: "Report a Bug",
      icon: "https://img.icons8.com/?size=100&id=9227&format=png&color=808080",
    },
    feature: {
      label: "Feature Request",
      icon: "https://img.icons8.com/?size=100&id=85887&format=png&color=808080",
    },
    content: {
      label: "Content / Notes",
      icon: "https://img.icons8.com/?size=100&id=fpAVFn3MN108&format=png&color=808080",
    },
    support: {
      label: "Account Support",
      icon: "https://img.icons8.com/?size=100&id=98973&format=png&color=808080",
    },
  };

  const { label: reason_label, icon: reason_icon } =
    CONTACT_REASONS[reason?.toLowerCase()] || CONTACT_REASONS["default"];

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>We've Received Your Message — NoteHub</title>
    <style>
        @media screen and (max-width: 600px) {
            .main-padding   { padding: 30px 20px !important; }
            .header-padding { padding: 25px 20px !important; }
            .footer-padding { padding: 25px 20px !important; }
            .logo-img       { width: 50px !important; height: 50px !important; }
        }
    </style>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#0a0a0a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;">
    <tr>
        <td align="center" style="padding:40px 10px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#1a1a1a;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.5);">

                <!-- Header -->
                <tr>
                    <td class="header-padding" style="background:linear-gradient(135deg,#1e1e1e 0%,#2a2a2a 100%);padding:30px;text-align:center;border-bottom:2px solid #333;">
                        <img src="https://res.cloudinary.com/dhtxrpqna/image/upload/v1770061775/notehub_2_xgrpqt.png" alt="NoteHub Logo" class="logo-img" style="width:60px;height:60px;object-fit:cover;margin-bottom:15px;display:inline-block;border-radius:50%;">
                        <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:600;letter-spacing:-0.5px;">Message Received ✓</h1>
                    </td>
                </tr>

                <!-- Body -->
                <tr>
                    <td class="main-padding" style="padding:40px 30px;">
                        <p style="margin:0 0 20px;color:#e0e0e0;font-size:16px;line-height:1.6;">
                            Hi <strong style="color:#ffffff;">${safeName}</strong>,
                        </p>
                        <p style="margin:0 0 25px;color:#e0e0e0;font-size:15px;line-height:1.7;">
                            Thanks for reaching out to NoteHub. We've received your message regarding <strong style="color:#ffffff;">${reason_label}</strong> and will get back to you as soon as possible.
                        </p>

                        <!-- Message recap -->
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                            <tr>
                                <td style="background-color:#252525;border-left:4px solid #ffdb70;border-radius:6px;padding:20px 24px;">
                                    <p style="margin:0 0 8px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.8px;font-weight:600;">Your message</p>
                                    <p style="margin:0;color:#d0d0d0;font-size:14px;line-height:1.7;font-style:italic;">${safeMessage}</p>
                                </td>
                            </tr>
                        </table>

                        <p style="margin:0;color:#b0b0b0;font-size:14px;line-height:1.6;">
                            In the meantime, feel free to explore notes on <a href="https://notehub-official.vercel.app" style="color:#ffdb70;text-decoration:none;">NoteHub</a>.
                        </p>
                        <p style="margin:20px 0 0;color:#b0b0b0;font-size:14px;line-height:1.6;">— The NoteHub Team</p>
                    </td>
                </tr>

                <!-- Footer -->
                <tr>
                    <td class="footer-padding" style="background-color:#151515;padding:30px;border-top:1px solid #2a2a2a;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                                <td style="text-align:center;padding-bottom:15px;">
                                    <img src="https://res.cloudinary.com/dhtxrpqna/image/upload/v1780641475/abhijeet-signature_quitsi.png" alt="Signature" style="max-width:180px;height:auto;display:inline-block;">
                                </td>
                            </tr>
                            <tr>
                                <td style="text-align:center;">
                                    <p style="margin:0;color:#666;font-size:13px;line-height:1.6;">
                                        <a href="https://notehub-official.vercel.app" style="color:#ffdb70;text-decoration:none;">notehub-official.vercel.app</a>
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

            </table>
            <p style="margin:20px 0 0;color:#555;font-size:12px;text-align:center;">
                © 2025 Abhijeet Singh Rajput. All rights reserved.
            </p>
        </td>
    </tr>
</table>
</body>
</html>`;
};

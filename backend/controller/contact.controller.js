import { ENV } from "../config/env.js";
import {
  contactConfirmationTemplate,
  contactTemplate,
} from "../services/emailTemplates.js";
import { sendEmail } from "../services/sendEmail.js";

// Validation
const VALID_REASONS = ["general", "bug", "feature", "content", "support"];

const validateContactForm = ({ name, email, reason, message }) => {
  const errors = [];

  if (!name || name.trim().length < 2) {
    errors.push("Name must be at least 2 characters.");
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Valid email is required.");
  }

  if (!reason || !VALID_REASONS.includes(reason.toLowerCase())) {
    errors.push("Invalid reason selected.");
  }

  if (!message || message.trim().length < 20) {
    errors.push("Message must be at least 20 characters.");
  }

  return errors;
};

export const sendContactEmail = async (req, res) => {
  try {
    // Honeypot
    if (req.body.website) {
      return res.status(400).json({
        success: false,
        message: "Spam detected.",
      });
    }

    const { name, email, reason, subject, message } = req.body;

    const errors = validateContactForm({
      name,
      email,
      reason,
      message,
    });

    if (errors.length) {
      return res.status(422).json({
        success: false,
        errors,
      });
    }

    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    const userAgent = req.headers["user-agent"];

    const submittedAt = new Date().toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    // Admin Email
    const html = contactTemplate({
      email,
      from_name: name,
      to_name: "Abhijeet",
      reason,
      subject,
      message,
      ip,
      userAgent,
      submittedAt,
    });

    const text = `
New Contact Form Submission

From: ${name}
Email: ${email}
Reason: ${reason}
Subject: ${subject || "N/A"}

Message:
${message}

--------------------------------

Submitted At: ${submittedAt}
IP Address: ${ip}
Browser: ${userAgent}
`;

    await sendEmail({
      email: ENV.CONTACT_EMAIL,
      subject: `[${reason}] Contact Form Submission from ${name}`,
      text,
      html,
    });

const confirmationText = `
Hello ${name},

Thank you for contacting NoteHub.

We've successfully received your message regarding "${reason}".

Our team will review it and get back to you as soon as possible.

Best regards,
Abhijeet
NoteHub
`;
    // User Confirmation Email
    await sendEmail({
      email,
      subject: "We've received your message — NoteHub",
      text: confirmationText,
      html: contactConfirmationTemplate({
        from_name: name,
        reason,
      }),
    });

    return res.status(200).json({
      success: true,
      message: "Message sent successfully.",
    });
  } catch (error) {
    console.error("Contact email error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send message. Please try again.",
    });
  }
};

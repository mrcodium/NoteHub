export const sendEmail = async (email, subject, text, html) => {
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "NoteHub",
          email: process.env.EMAIL_SENDER, 
        },
        to: [{ email }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("❌ Brevo API error:", data);
      throw new Error("Email failed");
    }
    console.log(data);
    return data;
  } catch (err) {
    console.error("❌ Email sending failed:", err);
    throw err;
  }
};

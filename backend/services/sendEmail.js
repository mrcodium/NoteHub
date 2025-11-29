import nodemailer from "nodemailer";

export const sendEmail = async (email, subject, text, html) => {
    console.log("testing start...");
    testSMTPConnection();
    console.log("testing end...");
    
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject,
        text, // plain text fallback
        html, // HTML content
    };

    await transporter.sendMail(mailOptions);
};

export const testSMTPConnection = async () => {
    const transporter = nodemailer.createTransport({
        port: 465,
        host: "smtp.gmail.com",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        secure: true,
    });

    try {
        await transporter.verify();
        console.log("✅ SMTP connection successful!");
        return true;
    } catch (error) {
        console.error("❌ SMTP connection failed:", error.message);
        return false;
    }
};
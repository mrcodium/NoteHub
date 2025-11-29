import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async (email, subject, text, html) => {
    try {
        const { data, error } = await resend.emails.send({
            from: 'NoteHub <onboarding@resend.dev>',
            to: email,
            subject: subject,
            html: html,
            text: text, // plain text fallback
        });

        if (error) {
            console.error('❌ Resend error:', error);
            throw error;
        }

        return data;
    } catch (error) {
        console.error('❌ Email sending failed:', error);
        throw error;
    }
};
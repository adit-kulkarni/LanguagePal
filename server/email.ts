import nodemailer from "nodemailer";
import { randomBytes } from "crypto";

// Create reusable transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export async function sendVerificationEmail(email: string, code: string) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your Spanish Learning Verification Code",
    html: `
      <h1>Verification Code</h1>
      <p>Your verification code is: <strong>${code}</strong></p>
      <p>This code will expire in 10 minutes.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
}

export function generateVerificationCode(): string {
  // Generate a 6-digit code
  return randomBytes(3).toString("hex").toUpperCase();
}

export function isVerificationCodeExpired(expiryDate: Date): boolean {
  return new Date() > expiryDate;
}

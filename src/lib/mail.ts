import nodemailer from 'nodemailer';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { secretToken, hash } from './security';
import { db } from './db';
export async function sendMail(to: string, subject: string, text: string) {
  if (!process.env.SMTP_HOST) {
    if (process.env.NODE_ENV === 'production') throw new Error('SMTP is required in production');
    await mkdir(path.join(process.cwd(), '.mail'), { recursive: true });
    await writeFile(
      path.join(process.cwd(), '.mail', `${Date.now()}-${secretToken().slice(0, 8)}.txt`),
      `To: ${to}\nSubject: ${subject}\n\n${text}`,
    );
    return;
  }
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 1025,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
  await transport.sendMail({
    from: process.env.MAIL_FROM || 'Mobile Shop <hello@mobile-shop.local>',
    to,
    subject,
    text,
  });
}
export async function sendAuthToken(userId: string, email: string, type: 'VERIFY' | 'RESET') {
  const token = secretToken();
  await db.authToken.create({
    data: {
      userId,
      type,
      tokenHash: hash(token),
      expiresAt: new Date(Date.now() + (type === 'RESET' ? 3600000 : 86400000)),
    },
  });
  const url = `${process.env.APP_URL || 'http://localhost:3000'}/account?mode=${type === 'VERIFY' ? 'verify' : 'reset'}&token=${token}`;
  await sendMail(
    email,
    type === 'VERIFY' ? 'Verify your Mobile Shop email' : 'Reset your Mobile Shop password',
    `Follow this link to ${type === 'VERIFY' ? 'verify your email' : 'reset your password'}:\n${url}\nIf you did not request this, ignore this email.`,
  );
}

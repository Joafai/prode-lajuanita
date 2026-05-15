import nodemailer from 'nodemailer'

function getTransporter() {
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!user || !pass) throw new Error('SMTP_NOT_CONFIGURED')
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: (process.env.SMTP_SECURE ?? 'true') === 'true',
    auth: { user, pass },
  })
}

function getFrom(): string {
  return process.env.SMTP_FROM ?? `La Juanita <${process.env.SMTP_USER}>`
}

export interface EmailMessage {
  to: string
  subject: string
  html: string
}

export async function sendEmail(msg: EmailMessage): Promise<void> {
  const transporter = getTransporter()
  await transporter.sendMail({ from: getFrom(), ...msg })
}

export async function sendEmailBatch(items: EmailMessage[]): Promise<{ sent: number; failed: number; total: number }> {
  const transporter = getTransporter()
  const from = getFrom()
  const results = await Promise.allSettled(
    items.map((i) => transporter.sendMail({ from, ...i }))
  )
  const sent = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.length - sent
  return { sent, failed, total: results.length }
}

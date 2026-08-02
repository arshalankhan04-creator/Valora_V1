import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendMail({ to, subject, text }) {
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
  })

  // Ethereal (recommended for dev/demo, see README) never delivers to a
  // real inbox — this URL is the only way to see what was actually sent.
  // getTestMessageUrl returns false for a real provider, so this is a
  // no-op in production.
  const previewUrl = nodemailer.getTestMessageUrl(info)
  if (previewUrl) console.log('Email preview:', previewUrl)
}

'use strict'

const nodemailer = require('nodemailer')

let transporter = null

function isConfigured() {
  const resend = process.env.RESEND_API_KEY && process.env.MAIL_FROM
  const smtp = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.MAIL_FROM
  return Boolean(resend || smtp)
}

function transport() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587)
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      family: 4,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    })
  }
  return transporter
}

async function sendMail({ to, subject, text, html }) {
  if (!isConfigured()) throw new Error('SMTP_NOT_CONFIGURED')
  if (process.env.RESEND_API_KEY) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject, text, html })
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(`RESEND_${response.status}: ${result.message || 'Falha no envio'}`)
    console.log(`[mail] E-mail enviado pela Resend: ${result.id}`)
    return { delivered: true, messageId: result.id }
  }
  const info = await transport().sendMail({ from: process.env.MAIL_FROM, to, subject, text, html })
  console.log(`[mail] E-mail enviado: ${info.messageId}`)
  return { delivered: true, messageId: info.messageId }
}

module.exports = { isConfigured, sendMail }

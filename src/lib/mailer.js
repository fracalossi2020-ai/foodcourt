'use strict'

/**
 * Serviço de e-mail do Food Court.
 *
 * Enquanto não houver transporte SMTP configurado (.env), os e-mails NÃO são
 * enviados de verdade — o link é apenas registrado no console do servidor.
 *
 * Para integrar um envio real:
 *   1. npm install nodemailer
 *   2. Preencha SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS e MAIL_FROM no .env
 *   3. Substitua o corpo de sendMail() por:
 *        const transporter = nodemailer.createTransport({ host, port, auth })
 *        return transporter.sendMail({ from, to, subject, html })
 */
function sendMail({ to, subject, text }) {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    console.log(`[mail] Transporte SMTP detectado, mas o transporte real não está ativado neste ambiente. Destinatário: ${to}`)
    return { delivered: false, reason: 'smtp-not-implemented' }
  }
  console.log(`[mail:dev] SMTP não configurado — e-mail NÃO enviado. Para: ${to} | Assunto: ${subject}`)
  if (text) console.log('[mail:dev] ' + text.split('\n').map(l => '    ' + l).join('\n'))
  return { delivered: false, reason: 'smtp-not-configured' }
}

module.exports = { sendMail }

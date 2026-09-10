'use strict';
const mailer = require('./mailer');
const pending = new Set();
async function send(member, store) {
  if (!mailer.isConfigured()) throw Object.assign(new Error('Configure o serviço de e-mail no servidor antes de enviar o acesso.'), { status: 503 });
  const url = new URL(process.env.APP_URL);
  if (url.protocol !== 'https:') throw new Error('APP_URL deve usar HTTPS.');
  url.pathname = '/'; url.search = ''; url.hash = '/parceiro-login';
  if (pending.has(member.id) || Date.now() - Date.parse(member.accessEmailSentAt || 0) < 60000) throw Object.assign(new Error('Aguarde um minuto antes de reenviar.'), { status: 429 });
  pending.add(member.id);
  try {
    await mailer.sendMail({ to: member.email, subject: `Seu acesso à equipe de ${store.name}`, text: `Olá, ${member.name}.\n\nVocê foi vinculado à equipe de ${store.name} como ${member.role === 'manager' ? 'gerente' : 'cozinha'}.\n\nEntre com sua conta FoodCourt: ${url.href}\n\nUse sua própria senha. Se não reconhece este vínculo, entre em contato com o suporte FoodCourt.` });
    member.accessEmailSentAt = new Date().toISOString();
    return { sent: true, sentAt: member.accessEmailSentAt };
  } finally { pending.delete(member.id); }
}
module.exports = { send };

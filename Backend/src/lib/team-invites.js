'use strict';
const crypto = require('node:crypto');
const mailer = require('./mailer');
const pending = new Set();
const hash = token => crypto.createHash('sha256').update(token).digest('hex');
async function invite(db, store, values) {
  const email = String(values.email || '').trim().toLowerCase(), name = String(values.name || '').trim().slice(0, 80), role = values.role;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || name.length < 2 || !['manager', 'kitchen'].includes(role)) throw new Error('Informe nome, e-mail e função válidos.');
  if (!mailer.isConfigured()) throw new Error('Configure o envio de e-mail antes de convidar.');
  if (db.state.storeMembers.some(member => member.storeId === store.id && member.email.toLowerCase() === email)) throw new Error('Este e-mail já está na equipe. Edite o cadastro existente.');
  const key = store.id + ':' + email;
  if (pending.has(key) || db.state.teamInvites.some(item => item.storeId === store.id && item.email === email && Date.now() - Date.parse(item.createdAt) < 60000)) throw new Error('Aguarde um minuto antes de reenviar o convite.');
  const token = crypto.randomBytes(32).toString('base64url');
  const url = new URL(process.env.APP_URL);
  if (url.protocol !== 'https:') throw new Error('Configure APP_URL com HTTPS.');
  url.pathname = '/'; url.search = ''; url.hash = '/aceitar-convite?token=' + token;
  const record = { id: db.uid('invite'), storeId: store.id, email, name, role, tokenHash: hash(token), createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 48 * 3600000).toISOString() };
  pending.add(key);
  try {
    try {
      await mailer.sendMail({ to: email, subject: `Convite para a equipe de ${store.name}`, text: `Olá, ${name}.\n\nVocê foi convidado para a equipe de ${store.name} como ${role === 'manager' ? 'gerente' : 'cozinha'}.\nCrie ou entre na conta FoodCourt com este e-mail e aceite pelo link abaixo. O convite expira em 48 horas.\n\n${url.href}\n\nSe não reconhece o convite, ignore esta mensagem.` });
    } catch { throw new Error('Não foi possível enviar o convite. Verifique o serviço de e-mail e tente novamente.'); }
    db.state.teamInvites = db.state.teamInvites.filter(item => !(item.storeId === store.id && item.email === email));
    db.state.teamInvites.push(record); db.saveNow();
    return { sent: true };
  } finally { pending.delete(key); }
}
function find(db, user, token) {
  if (!/^[\w-]{43}$/.test(token || '')) throw new Error('Convite inválido.');
  const record = db.state.teamInvites.find(item => item.tokenHash === hash(token));
  if (!record || Date.parse(record.expiresAt) <= Date.now()) throw new Error('Convite expirado, cancelado ou já utilizado. Peça um novo convite à loja.');
  if (record.email !== user.email.toLowerCase()) throw new Error('Entre na conta com o mesmo e-mail que recebeu o convite.');
  return record;
}
function accept(db, user, token) {
  const record = find(db, user, token);
  if (!db.state.stores.some(store => store.id === record.storeId)) throw new Error('Loja não encontrada.');
  if (db.state.stores.some(store => store.ownerId === user.id) || db.state.storeMembers.some(member => member.userId === user.id && member.active !== false)) throw new Error('Sua conta já gerencia uma loja. Use uma conta sem outro vínculo ativo.');
  if (db.state.storeMembers.some(member => member.storeId === record.storeId && member.email.toLowerCase() === record.email)) throw new Error('Você já possui um cadastro nesta equipe. Solicite a reativação à loja.');
  db.state.storeMembers.push({ id: db.uid('member'), storeId: record.storeId, userId: user.id, email: record.email, name: record.name, role: record.role, active: true });
  db.state.teamInvites = db.state.teamInvites.filter(item => item !== record); db.saveNow();
  return { accepted: true };
}
module.exports = { invite, find, accept };

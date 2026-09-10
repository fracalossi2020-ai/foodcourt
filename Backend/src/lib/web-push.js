'use strict';
const webpush = require('web-push');
function config() {
  const { VAPID_PUBLIC_KEY: publicKey, VAPID_PRIVATE_KEY: privateKey, VAPID_SUBJECT: subject } = process.env;
  return { enabled: Boolean(publicKey && privateKey && subject), publicKey, privateKey, subject };
}
function validate(subscription) {
  const url = new URL(subscription?.endpoint);
  const allowed = ['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com'];
  if (url.protocol !== 'https:' || url.port || url.username || url.password || !allowed.includes(url.hostname) || url.href.length > 2048) throw new Error('Serviço de notificação não suportado.');
  const keys = subscription.keys || {};
  if (!/^[\w-]{87}$/.test(keys.p256dh || '') || !/^[\w-]{22}$/.test(keys.auth || '')) throw new Error('Chaves de notificação inválidas.');
  return { endpoint: url.href, keys: { p256dh: keys.p256dh, auth: keys.auth } };
}
async function notify(db, userId) {
  const settings = config();
  if (!settings.enabled) return;
  await Promise.all(db.state.pushSubscriptions.filter(item => item.userId === userId).map(async item => {
    try {
      await webpush.sendNotification(item.subscription, JSON.stringify({ title: 'FoodCourt', body: 'Você tem uma atualização. Entre na sua conta para consultar.', url: '/#/notificacoes' }), { vapidDetails: settings, TTL: 300, timeout: 10000 });
    } catch (error) {
      if ([404, 410].includes(error.statusCode)) { db.state.pushSubscriptions = db.state.pushSubscriptions.filter(entry => entry !== item); db.save(); }
      else console.error('[push] Não foi possível entregar a notificação.');
    }
  }));
}
module.exports = { config, validate, notify };

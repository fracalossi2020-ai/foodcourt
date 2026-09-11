'use strict';

function configuration(env = process.env) {
  const has = (...names) => names.every(name => Boolean(env[name]?.trim()));
  const https = value => { try { return new URL(value).protocol === 'https:'; } catch { return false; } };
  return [
    { name: 'Endereço público HTTPS', configured: https(env.APP_URL), next: 'Definir APP_URL com o endereço público do site.' },
    { name: 'Mercado Pago e webhook', configured: has('MERCADO_PAGO_ACCESS_TOKEN', 'MERCADO_PAGO_WEBHOOK_SECRET'), next: 'Configurar credenciais, cadastrar webhook e validar cobrança e estorno de teste.' },
    { name: 'E-mail', configured: has('MAIL_FROM') && (has('RESEND_API_KEY') || has('SMTP_HOST', 'SMTP_USER', 'SMTP_PASS')), next: 'Configurar remetente e provedor; validar envio e recebimento de convite.' },
    { name: 'Notificações push', configured: has('VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT'), next: 'Configurar VAPID e testar adesão e entrega no navegador.' },
    { name: 'Frete por trajeto', configured: has('GOOGLE_ROUTES_API_KEY'), next: 'Habilitar Google Routes, configurar a chave e validar endereços reais.' },
    { name: 'Mapa e previsão de chegada', configured: has('GOOGLE_ROUTES_API_KEY', 'GOOGLE_MAPS_EMBED_KEY') && env.GOOGLE_ROUTES_API_KEY !== env.GOOGLE_MAPS_EMBED_KEY, next: 'Configurar uma chave pública restrita ao domínio para Maps Embed, além da chave privada de Routes.' },
  ];
}
function snapshot(db, backups) {
  return { database: db.health(), backups: backups.health(), integrations: configuration() };
}
module.exports = { configuration, snapshot };

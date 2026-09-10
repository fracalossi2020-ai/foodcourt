'use strict';

async function main() {
  const base = process.argv[2];
  if (!base) throw new Error('Uso: node scripts/health-check.js https://seu-dominio');
  const target = new URL('/api/health', base);
  if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password) throw new Error('Informe uma URL HTTP(S) sem credenciais.');
  const started = Date.now();
  const response = await fetch(target, { signal: AbortSignal.timeout(10000), redirect: 'error' });
  if (!response.ok) throw new Error(`Backend indisponível: HTTP ${response.status}`);
  const data = await response.json();
  if (data.status !== 'ok' || !Number.isFinite(data.uptime)) throw new Error('Resposta de saúde inválida.');
  console.log(JSON.stringify({ status: 'ok', latencyMs: Date.now() - started, uptimeSeconds: data.uptime, checkedAt: new Date().toISOString() }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

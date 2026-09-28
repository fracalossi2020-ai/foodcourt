/* global process, console, setTimeout, document, location, innerWidth, URL */
// Isolated UI audit. Never reads .env, uses production data or calls providers.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'foodcourt-ui-audit-'));
const playwrightPath = process.env.FC_PLAYWRIGHT_MODULE;
const chromiumPath = process.env.FC_CHROMIUM_PATH;
if (!playwrightPath || !chromiumPath) throw new Error('Set FC_PLAYWRIGHT_MODULE and FC_CHROMIUM_PATH');
const { chromium } = require(playwrightPath);
for (const key of Object.keys(process.env)) {
  if (!/^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|USERPROFILE|LOCALAPPDATA|APPDATA|COMSPEC)$/i.test(key)) delete process.env[key];
}
Object.assign(process.env, {
  FC_DB_PATH: path.join(temporary, 'db.json'),
  SESSION_SECRET: 'isolated-browser-audit-secret-32-characters',
  SEED_DEMO_DATA: '1', PLATFORM_ADMIN_EMAIL: 'admin@foodcourt.com',
  APP_URL: 'http://127.0.0.1', NODE_ENV: 'test',
});
require('../src/lib/env').loadEnv = () => {};
const originalFetch = global.fetch;
global.fetch = (url, options) => {
  if (!/^http:\/\/127\.0\.0\.1[:/]/.test(String(url))) throw new Error('External calls disabled in audit');
  return originalFetch(url, options);
};
const { server, start } = require('../src/server');
const db = require('../src/lib/db');
const merchant = db.findByEmail('dono@foodcourt.com');
if (!db.state.stores.length) db.state.stores.push({ id:'audit-store', name:'Loja de teste', slug:'audit-store', category:'Restaurante', status:'active', open:true, products:[] });
db.state.stores[0].ownerId = merchant.id;
db.saveNow();
const results = [];
(async () => {
  start(0);
  await new Promise(resolve => server.listening ? resolve() : server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: chromiumPath });
  try {
    for (const width of [1440, 390]) {
      for (const [email, routes] of [
        [null, ['/', '/login', '/cadastro', '/esqueci-senha', '/redefinir-senha', '/instalar', '/termos', '/privacidade', '/cancelamento', '/para-estabelecimentos', '/cadastro-parceiro', '/login-parceiro']],
        ['joao@foodcourt.com', ['/inicio', '/buscar', '/pedidos', '/favoritos', '/ofertas', '/notificacoes', '/perfil', '/fidelidade', '/suporte', '/checkout', '/quero-ser-entregador', ...['conta','enderecos','pagamentos','beneficios','seguranca','privacidade','configuracoes'].map(id => `/perfil?secao=${id}`)]],
        ['dono@foodcourt.com', ['dashboard','pedidos','cardapio','promocoes','financeiro','avaliacoes','minhaloja','horarios','plano','configuracoes','equipe','suporte'].map(id => `/parceiro?secao=${id}`)],
        ['admin@foodcourt.com', ['visao','usuarios','lojas','entregadores','pedidos','entregas','pagamentos','suporte','auditoria','sistema'].map(id => `/admin?secao=${id}`)],
      ]) {
        const context = await browser.newContext({ viewport: { width, height: 950 }, reducedMotion: 'reduce' });
        await context.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort());
        if (email) {
          const response = await context.request.post(`${base}/api/auth/login`, { data: { email, password: 'foodcourt123' } });
          assert.equal(response.status(), 200);
        }
        const page = await context.newPage();
        let errors = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => { if (message.type() === 'error' && message.text().includes('[navigation]')) errors.push(message.text()); });
        for (const route of routes) {
          errors = [];
          await page.goto(`${base}/#${route}`, { waitUntil: 'domcontentloaded' });
          await page.waitForFunction(() => document.querySelector('#view')?.getAttribute('aria-busy') === 'false', { timeout: 15000 }).catch(() => errors.push('Render timeout'));
          await page.waitForTimeout(120);
          if (route === '/buscar') {
            // Test with deliberately reordered API responses; no real provider.
            await page.route('**/api/search?*', async intercepted => {
              const q = new URL(intercepted.request().url()).searchParams.get('q');
              if (q === 'old') await new Promise(resolve => setTimeout(resolve, 650));
              await intercepted.fulfill({ contentType:'application/json', body:JSON.stringify({ restaurants:[], products:[], categories:[] }) });
            });
            const input = page.locator('#searchInput');
            await input.fill('old');
            await input.press('Enter');
            await input.fill('new');
            await input.press('Enter');
            await page.waitForTimeout(850);
            assert.match(await page.locator('#searchBody').innerText(), /new/);
            await page.locator('#clearSearch').click();
            const suggestion = page.locator('[data-sug]').first();
            const query = await suggestion.getAttribute('data-sug');
            await suggestion.click();
            assert.equal(await input.inputValue(), query);
            await page.waitForTimeout(100);
            assert.match(await page.locator('#searchBody').innerText(), /Nada encontrado/);
            await input.fill('old');
            await input.press('Enter');
            await page.locator('#clearSearch').click();
            await page.waitForTimeout(850);
            assert.ok(await page.locator('[data-sug]').count() > 0);
            await page.unroute('**/api/search?*');
            console.log(`Search interaction regressions passed at ${width}px`);
          }
          const state = await page.evaluate(() => ({
            overflow: document.documentElement.scrollWidth > innerWidth + 2,
            error: document.querySelector('.route-error')?.textContent || null,
            partnerRendered: !location.hash.startsWith('#/parceiro') || Boolean(document.querySelector('.partner-main')),
            text: document.querySelector('#view')?.textContent.trim().slice(0, 160),
          }));
          results.push({ width, route, errors: [...errors], ...state });
          console.log(JSON.stringify(results.at(-1)));
        }
        await context.close();
      }
    }
  } finally { await browser.close(); server.close(); }
  const failed = results.filter(row => row.errors.length || row.error || row.overflow || !row.text || !row.partnerRendered);
  console.log(JSON.stringify({ total: results.length, failed }, null, 2));
  process.exit(failed.length ? 1 : 0);
})().catch(error => { console.error(error); server.close(); process.exit(1); });

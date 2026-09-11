import { canInstall, install, installed } from '../core/app-install.js';
let refresh;
export function render(view) {
  view.innerHTML = '<section class="card" style="max-width:640px;margin:24px auto;padding:24px"><img src="/assets/icons/app-192.png" alt="" width="72" height="72" style="border-radius:16px"><h1>FoodCourt na tela inicial</h1><p style="margin:16px 0">Abra seus pedidos pelo ícone do FoodCourt, em uma janela de aplicativo. É necessário acesso à internet para usar o serviço.</p><button class="btn btn-primary" data-install hidden>Instalar FoodCourt</button><p role="status" style="margin:16px 0"></p><h2>No iPhone ou iPad</h2><p style="margin:12px 0 24px">Abra este site no Safari, toque em Compartilhar e escolha Adicionar à Tela de Início. Se aparecer, ative Abrir como App e toque em Adicionar.</p><h2>No Android ou computador</h2><p style="margin:12px 0 24px">Use o botão de instalação acima quando disponível. Você também pode procurar Instalar aplicativo ou Adicionar à tela inicial no menu do navegador. A disponibilidade depende do navegador e do dispositivo.</p><a class="btn btn-outline" href="#/inicio">Voltar ao FoodCourt</a></section>';
  const button = view.querySelector('[data-install]');
  const status = view.querySelector('[role=status]');
  refresh = () => { button.hidden = installed() || !canInstall(); status.textContent = installed() ? 'Você já está usando o FoodCourt como aplicativo.' : canInstall() ? 'A instalação está disponível neste navegador.' : 'Siga as instruções abaixo para adicionar o FoodCourt.'; };
  button.onclick = async () => { button.disabled = true; try { const accepted = await install(); status.textContent = accepted ? 'Instalação solicitada. Confira a tela inicial ou os aplicativos do dispositivo.' : 'Instalação não confirmada. Você pode continuar pelo navegador.'; } catch { status.textContent = 'Não foi possível iniciar a instalação. Use o menu do navegador.'; } finally { button.disabled = false; } };
  window.addEventListener('fc:install-ready', refresh); refresh();
}
export function cleanup() { window.removeEventListener('fc:install-ready', refresh); }

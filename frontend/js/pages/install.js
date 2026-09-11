import { canInstall, install, installed } from '../core/app-install.js';
let refresh;
export function render(view) {
  view.innerHTML = "<div class=\"install-page\"><a class=\"install-back\" href=\"#/inicio\">← Voltar ao FoodCourt</a><section class=\"install-hero\"><div class=\"install-copy\"><span class=\"install-eyebrow\">SEU FOODCOURT, MAIS PERTO</span><h1>Seu próximo pedido.<br>A um toque.</h1><p>Leve o FoodCourt para a tela inicial e abra direto pelo ícone, como um aplicativo.</p><button class=\"btn btn-primary\" data-install hidden>Adicionar à tela inicial ↗</button><p role=\"status\"></p><div class=\"install-benefits\"><span>Sem loja de aplicativos</span><span>Acesso direto</span></div></div><div class=\"install-visual\" aria-hidden=\"true\"><img class=\"install-app-icon\" src=\"/assets/icons/foodcourt-app.svg\" alt=\"\" width=\"104\" height=\"104\"><div class=\"install-app-label\"><b>FoodCourt</b><small>Seu pedido, do seu jeito.</small></div></div></section><header class=\"install-guide-head\"><h2>Como adicionar no seu dispositivo</h2><p>Escolha as instruções para o navegador que você usa.</p></header><div class=\"install-guides\"><section class=\"install-guide\"><h3>iPhone e iPad</h3><ol><li><span>Se estiver no app Google, Chrome, WhatsApp ou Instagram, copie o endereço deste site e abra no <strong>Safari</strong>.</span></li><li><span>Toque em <strong>Compartilhar</strong> e depois em <strong>Adicionar à Tela de Início</strong>.</span></li><li><span>Se aparecer, ative <strong>Abrir como App</strong>. Confirme em <strong>Adicionar</strong>.</span></li></ol></section><section class=\"install-guide\"><h3>Android e computador</h3><ol><li><span>Toque no <strong>botão de instalação</strong> acima, quando disponível.</span></li><li><span>Ou abra o menu do navegador e procure <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.</span></li><li><span>Confirme e abra o FoodCourt pelo novo ícone.</span></li></ol></section></div><p class=\"install-note\">Precisa de conexão com a internet. A instalação depende do navegador e do dispositivo.</p></div>";
  const button = view.querySelector('[data-install]');
  const status = view.querySelector('[role=status]');
  refresh = () => { button.hidden = installed(); button.style.display = button.hidden ? "none" : ""; button.textContent = canInstall() ? 'Instalar FoodCourt' : 'Como adicionar à tela inicial'; status.textContent = installed() ? 'Você já está usando o FoodCourt como aplicativo.' : canInstall() ? 'A instalação está disponível neste navegador.' : 'Seu navegador pode exigir a instalação pelo menu. Toque acima para ver os passos.'; };
  button.onclick = async () => {
    if (!canInstall()) {
      const guides = view.querySelector('.install-guide-head');
      guides.tabIndex = -1; guides.focus({ preventScroll: true });
      guides.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
      return;
    }
    button.disabled = true; try { const accepted = await install(); status.textContent = accepted ? 'Instalação solicitada. Confira a tela inicial ou os aplicativos do dispositivo.' : 'Instalação não confirmada. Você pode continuar pelo navegador.'; } catch { status.textContent = 'Não foi possível iniciar a instalação. Use o menu do navegador.'; } finally { button.disabled = false; }
  };
  window.addEventListener('fc:install-ready', refresh); refresh();
}
export function cleanup() { window.removeEventListener('fc:install-ready', refresh); }

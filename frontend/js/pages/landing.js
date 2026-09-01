import { api } from '../core/api.js'

let turnstileToken=''
let turnstileWidgetId=null
let turnstileScriptPromise=null

function loadTurnstileScript(){
  if(window.turnstile)return Promise.resolve(window.turnstile)
  if(turnstileScriptPromise)return turnstileScriptPromise
  turnstileScriptPromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script')
    script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async=true;script.defer=true
    script.onload=()=>resolve(window.turnstile)
    script.onerror=()=>reject(new Error('Não foi possível carregar a verificação de segurança.'))
    document.head.appendChild(script)
  })
  return turnstileScriptPromise
}

async function renderTurnstile(view,config){
  const container=view.querySelector('#landingTurnstile'),error=view.querySelector('.fcv2-error')
  if(!container||!config.enabled)return
  try{
    const widget=await loadTurnstileScript()
    if(!container.isConnected||!widget)return
    turnstileWidgetId=widget.render(container,{sitekey:config.siteKey,action:'login',theme:'light',size:'flexible',language:'pt-BR',callback:token=>{turnstileToken=token;error.hidden=true},'expired-callback':()=>{turnstileToken=''},'error-callback':()=>{turnstileToken='';error.textContent='Não foi possível concluir a verificação de segurança.';error.hidden=false}})
  }catch(err){error.textContent=err.message;error.hidden=false}
}

const FAQ_ITEMS=[['O que é o FoodCourt?','Uma plataforma para descobrir estabelecimentos, escolher produtos e fazer seus pedidos.'],['Como faço para criar uma conta?','Clique em “Criar conta”, informe seus dados e siga as etapas.'],['Como encontro estabelecimentos perto de mim?','Após entrar, informe sua localização para visualizar opções na sua região.'],['Posso acompanhar meu pedido?','Sim. A área interna mostra o andamento do pedido até a entrega.'],['Como funcionam os pagamentos?','As formas disponíveis são apresentadas durante a finalização do pedido.'],['Tenho um estabelecimento. Como posso vender no FoodCourt?','Acesse o cadastro e selecione a opção destinada a estabelecimentos.'],['Existe aplicativo para celular?','Os aplicativos serão divulgados quando estiverem disponíveis.'],['Como entro em contato com o suporte?','Utilize a Central de Ajuda disponível no seu perfil.']]

export async function render(view,boot,_params={},query=new URLSearchParams()) {
  const partnerLogin=query.get('portal')==='parceiro'
  const turnstileConfig=await api.turnstileConfig().catch(()=>({enabled:false,siteKey:''}))
  turnstileToken='';turnstileWidgetId=null
  view.innerHTML = `<div class="fc-landing-v2">
    <div class="landing-scroll-progress" aria-hidden="true"><i></i></div>
    <header class="fcv2-nav">
      <a class="fcv2-logo" href="#/" aria-label="FoodCourt - início"><img class="brand-logo-image" src="/assets/images/foodcourt-logo.png" alt="Food Court"></a>
      <nav aria-label="Navegação da landing"><button data-scroll="top" class="active">Início</button><button data-scroll="como">Como funciona</button><button data-scroll="vantagens">Vantagens</button><button data-scroll="parceiros">Para estabelecimentos</button><button data-scroll="contato">Contato</button></nav>
      <div><a class="fcv2-enter" href="#/login">${uiIcon('user')} <span>Entrar</span></a><a class="fcv2-create" href="#/cadastro">Criar conta</a><button class="fcv2-menu" aria-label="Abrir menu" aria-expanded="false">${uiIcon('menu')}</button></div>
    </header>

    <section id="top" class="fcv2-hero">
      <div class="hero-float-layer" aria-hidden="true">
        <span class="hero-float-card hero-delivery"><i>${uiIcon('scooter')}</i><span><b>Entrega rápida</b><small>Chega em 20–30 min</small></span></span>
        <span class="hero-float-card hero-offer"><i>${uiIcon('tag')}</i><span><b>Oferta do dia</b><small>até 30% de desconto</small></span></span>
        <span class="hero-leaf hero-leaf-one">◆</span><span class="hero-leaf hero-leaf-two">◆</span>
      </div>
      <div class="fcv2-copy">
        <span class="fcv2-pill">${uiIcon('leaf')} Sua próxima refeição está aqui!</span>
        <h1>Seu pedido favorito,<br><em>do seu jeito.</em></h1>
        <p>Encontre restaurantes incríveis, peça com poucos cliques e receba onde estiver. Rápido, fácil e feito para você.</p>
        <div class="fcv2-actions"><a href="#/cadastro">Criar conta grátis</a><button data-scroll="como">${uiIcon('play')} Saiba mais</button></div>
        <section class="fcv2-proof" aria-label="Diferenciais FoodCourt">
          ${proof('store','+2.000','restaurantes parceiros')}${proof('scooter','Entrega rápida','e segura')}${proof('tag','Ofertas exclusivas','todos os dias')}${proof('star','4,9 ★','avaliações de clientes')}
        </section>
      </div>

      <aside class="fcv2-login" aria-label="Acessar sua conta">
        <h2>${partnerLogin?'Portal do Parceiro':'Que bom te ver por aqui!'}</h2><p>${partnerLogin?'Entre com a conta do seu estabelecimento.':'Entre ou crie sua conta para continuar.'}</p>
        <button class="social" data-social="google"><b class="google">${uiIcon('google')}</b>Continuar com Google</button>
        <div class="fcv2-or"><span>ou</span></div>
        <form id="landingLogin" novalidate>
          <label><span>${uiIcon('mail')}</span><input name="email" type="email" autocomplete="email" placeholder="E-mail" aria-label="E-mail"></label>
          <label><span>${uiIcon('lock')}</span><input name="password" type="password" autocomplete="current-password" placeholder="Senha" aria-label="Senha"><button type="button" data-eye aria-label="Mostrar senha">${uiIcon('eye')}</button></label>
          ${turnstileConfig.enabled?'<div class="fcv2-turnstile" id="landingTurnstile" aria-label="Verificação de segurança"></div>':''}
          <div class="fcv2-error" role="alert" hidden></div>
          <button class="fcv2-submit" type="submit">${partnerLogin?'Entrar no Portal':'Entrar'}</button>
          <div class="fcv2-loginrow"><label><input type="checkbox"> Lembrar de mim</label><a href="#/esqueci-senha">Esqueci minha senha</a></div>
        </form>
        <footer>${partnerLogin?'Ainda não cadastrou sua loja? <a href="#/cadastro-parceiro">Cadastrar estabelecimento</a>':'Ainda não tem uma conta? <a href="#/cadastro">Criar conta</a>'}</footer>
      </aside>
    </section>

    <section class="fcv2-benefits" id="quick-benefits">
      ${benefit('location','Encontre perto de você','Descubra restaurantes e lojas disponíveis na sua região.')}
      ${benefit('phone','Peça em poucos cliques','Escolha seus pratos favoritos e finalize seu pedido rapidamente.')}
      ${benefit('bag','Acompanhe sua entrega','Veja o andamento do seu pedido em tempo real até ele chegar.')}
      ${benefit('shield','Pagamento seguro','Seus dados e pagamentos protegidos com tecnologia de ponta.')}
    </section>
    ${introduction()}${howItWorks()}${variety()}${whyFoodCourt()}${promotion()}${mobileExperience()}${trust()}${testimonials()}${partnerSection()}${faq()}${finalCta()}${landingFooter()}${helpWidget()}
  </div>`
  bind(view,partnerLogin,query,turnstileConfig)
  if(turnstileConfig.enabled)renderTurnstile(view,turnstileConfig)
  if (location.hash.replace(/^#/, '').split('?')[0] === '/login') {
    requestAnimationFrame(() => {
      const login = view.querySelector('.fcv2-login')
      login?.scrollIntoView({ behavior:'smooth', block:'center' })
      setTimeout(() => login?.querySelector('input[name="email"]')?.focus(), 250)
    })
  }
}

function proof(icon,title,text){return `<article><i>${uiIcon(icon)}</i><p><b>${title}</b><span>${text}</span></p></article>`}
function benefit(icon,title,text){return `<article><i>${uiIcon(icon)}</i><div><h3>${title}</h3><p>${text}</p></div></article>`}
function uiIcon(name){const paths={brand:'<path d="M4 17h16M6 14a6 6 0 0 1 12 0H6Zm6-6V5M10 5h4M13 3c2-2 4-1 5-3-3 0-5 1-5 3Z"/>',user:'<circle cx="12" cy="8" r="3.5"/><path d="M5 21c.8-4 3.3-6 7-6s6.2 2 7 6"/>',menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',leaf:'<path d="M19 4C11 4 6 8 6 14c5 1 10-2 13-10Z"/><path d="M5 20c2-6 6-9 11-12"/>',play:'<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4V8Z"/>',store:'<path d="M4 10v10h16V10M3 4h18l-2 6H5L3 4Z"/><path d="M9 20v-6h6v6"/>',scooter:'<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.5 18h5l2-7h-5M14 13h5l2 5M7 8h4"/>',tag:'<path d="M3 4h8l10 10-7 7L4 11V4Z"/><circle cx="8" cy="8" r="1.2"/>',star:'<path d="m12 2 3 6 7 .9-5 4.8 1.2 6.8L12 17.3l-6.2 3.2L7 13.7 2 8.9 9 8l3-6Z"/>',google:'<path fill="#4285f4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.7h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.3 3-7.2Z"/><path fill="#34a853" d="M12 22c2.7 0 5-.9 6.6-2.5l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z"/><path fill="#fbbc05" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9l3.3-2.6Z"/><path fill="#ea4335" d="M12 6c1.5 0 2.8.5 3.9 1.5l2.8-2.8A9.5 9.5 0 0 0 3.1 7.5l3.3 2.6C7.2 7.8 9.4 6 12 6Z"/>',apple:'<path d="M16.7 12.6c0-2 1.6-3 1.7-3.1-1-1.4-2.4-1.5-3-1.5-1.3-.1-2.5.8-3.1.8-.7 0-1.7-.8-2.8-.8-1.4 0-2.8.9-3.5 2.2-1.5 2.6-.4 6.5 1 8.6.7 1 1.6 2.1 2.7 2 1.1 0 1.5-.7 2.9-.7 1.3 0 1.7.7 2.9.7 1.2 0 2-1 2.7-2 1-1.2 1.3-2.4 1.3-2.5-.1 0-2.8-1.1-2.8-3.7ZM14.6 6.6c.6-.8 1-1.8.9-2.8-.9 0-2 .6-2.7 1.3-.6.7-1.1 1.7-1 2.7 1 .1 2.1-.5 2.8-1.2Z"/>',mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',eye:'<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>',location:'<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',phone:'<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M10 5h4M11 18h2"/>',bag:'<path d="M5 8h14l1 13H4L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>',shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>'};const filled=name==='apple'||name==='google';return `<svg class="ui-icon ui-${name}" viewBox="0 0 24 24" aria-hidden="true" ${filled?'fill="currentColor"':'fill="none" stroke="currentColor"'}>${paths[name]}</svg>`}
function introduction(){return `<section class="fcv2-section fcv2-intro reveal"><div><span class="section-kicker">DESCUBRA O FOODCOURT</span><h2>Tudo o que você quer comer,<br><em>em um só lugar.</em></h2><p>Do almoço de domingo ao lanche da madrugada, o FoodCourt conecta você aos sabores que fazem parte do seu dia.</p><ul><li>Restaurantes próximos</li><li>Diversidade de sabores</li><li>Promoções exclusivas</li><li>Pedido simples e rápido</li></ul><a class="primary-cta" href="#/cadastro">Explorar o FoodCourt</a></div><div class="intro-food" role="img" aria-label="Pizza, hambúrguer, sushi e salada em uma mesa"></div></section>`}
function howItWorks(){return `<section class="fcv2-section fcv2-how reveal" id="como"><header class="section-title"><span class="section-kicker">COMO FUNCIONA</span><h2>Pedir ficou muito mais simples.</h2><p>Do desejo à sua porta em poucos passos.</p></header><div class="steps">${[['location','Encontre','Descubra restaurantes e estabelecimentos disponíveis perto de você.'],['bag','Escolha','Monte seu pedido com seus pratos e produtos favoritos.'],['delivery','Receba','Acompanhe o pedido e receba onde estiver.']].map(x=>`<article><i>${stepIcon(x[0])}</i><h3>${x[1]}</h3><p>${x[2]}</p></article>`).join('')}</div></section>`}
function stepIcon(name){const paths={location:'<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',bag:'<path d="M5 8h14l1 13H4L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>',delivery:'<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.5 18h7M3.5 15l2-7h8l3 4h3l1 6M7 8l2-4h4M14 12h4"/>'};return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`}
function variety(){const cats=[['Hambúrguer','burger'],['Pizza','pizza'],['Japonês','sushi'],['Massas','pasta'],['Açaí','acai'],['Saudável','healthy'],['Sobremesas','dessert'],['Bebidas','drinks']];return `<section class="fcv2-section fcv2-variety reveal"><header class="section-title left"><h2>Nossas categorias</h2><p>Veja opções e momentos sempre com algo esperando por você!</p></header><div class="food-mosaic">${cats.map(x=>`<article class="food-${x[1]}"><span>${x[0]}</span></article>`).join('')}</div></section>`}
function whyFoodCourt(){const items=[['location','Opções perto de você','Encontre estabelecimentos disponíveis na sua região.'],['speed','Rápido e simples','Faça seu pedido sem complicação.'],['offer','Ofertas exclusivas','Descubra promoções e oportunidades para economizar.'],['security','Pagamento seguro','Mais proteção durante suas compras.'],['favorite','Seus favoritos','Tenha seus estabelecimentos preferidos sempre por perto.'],['support','Suporte quando precisar','Uma experiência pensada para acompanhar você.']];return `<section class="fcv2-why reveal" id="vantagens"><div class="fcv2-section"><header class="section-title"><span class="section-kicker">VANTAGENS</span><h2>Por que escolher o FoodCourt?</h2><p>Mais facilidade para pedir. Mais opções para escolher.</p></header><div class="why-grid">${items.map(x=>`<article><i>${outlineIcon(x[0])}</i><h3>${x[1]}</h3><p>${x[2]}</p></article>`).join('')}</div></div></section>`}
function outlineIcon(name){const paths={location:'<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',speed:'<path d="M13 2 4 14h8l-1 8 9-12h-8l1-8Z"/>',offer:'<path d="M3 4h8l10 10-7 7L4 11V4Z"/><circle cx="8" cy="8" r="1.25"/>',security:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',favorite:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.9-8.6a5.5 5.5 0 0 0-.1-7.8Z"/>',support:'<circle cx="12" cy="12" r="9"/><path d="M5 15v-3a7 7 0 0 1 14 0v3M5 15h3v4H6a1 1 0 0 1-1-1v-3Zm14 0h-3v4h2a1 1 0 0 0 1-1v-3Z"/><path d="M16 19c0 1-1 2-3 2"/>'};return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`}
function promotion(){return `<section class="fcv2-section promo-banner reveal"><div><span class="section-kicker light">COMECE AGORA</span><h2>Seu próximo pedido<br>pode estar a poucos cliques.</h2><p>Crie sua conta grátis e descubra tudo o que o FoodCourt pode oferecer.</p><div><a href="#/cadastro">CRIAR CONTA GRÁTIS</a><button data-scroll="como">Saiba como funciona</button></div><ul><li>Cadastro gratuito</li><li>Fácil de usar</li><li>Diversas opções</li></ul></div></section>`}
function mobileExperience(){return `<section class="fcv2-section mobile-exp reveal"><div class="phone-mock" aria-label="Representação do FoodCourt em um smartphone"><div class="phone-screen"><b>FOOD<span>COURT</span></b><small>${uiIcon('location')} Entregar em Casa</small><h3>O que você quer pedir?</h3><label>Buscar comida...</label><div class="mini-cats"><i>Hambúrguer</i><i>Pizza</i><i>Sushi</i></div><div class="mini-order"><strong>Seu pedido está a caminho</strong><span>●────●────○</span><small>Chega em 18–25 min</small></div></div></div><div><span class="section-kicker">EXPERIÊNCIA MOBILE</span><h2>FoodCourt onde<br><em>você estiver.</em></h2><p>Encontre, escolha, peça e acompanhe tudo pelo celular.</p><ul><li>${uiIcon('location')}<span><b>Descubra novos lugares</b><small>Explore opções ao seu redor.</small></span></li><li>${outlineIcon('favorite')}<span><b>Salve seus favoritos</b><small>Encontre o que ama rapidamente.</small></span></li><li>${stepIcon('delivery')}<span><b>Acompanhe seus pedidos</b><small>Saiba cada etapa da entrega.</small></span></li><li>${uiIcon('tag')}<span><b>Receba ofertas</b><small>Economize em seus favoritos.</small></span></li></ul><div class="app-buttons"><a href="#/cadastro"><small>ACESSE PELO</small>Navegador</a><a href="#/cadastro"><small>CRIE SUA CONTA</small>Grátis</a></div></div></section>`}
function trust(){return `<section class="fcv2-section trust reveal"><header class="section-title"><span class="section-kicker">FEITO PARA VOCÊ</span><h2>Uma experiência feita para você.</h2><p>Uma plataforma em evolução, construída para conectar clientes e estabelecimentos.</p></header><div>${[['Perto','Opções na sua região'],['Simples','Pedido em poucos passos'],['Seguro','Pagamento protegido'],['Real','Acompanhe cada etapa']].map(x=>`<article><b>${x[0]}</b><span>${x[1]}</span></article>`).join('')}</div></section>`}
const demoTestimonials=[['AM','Ana Martins','Encontrei várias opções perto de casa e consegui fazer meu pedido sem complicação.'],['RL','Rafael Lima','Gostei principalmente da facilidade para encontrar lugares diferentes.'],['CS','Camila Souza','Acompanhar tudo pelo celular deixa o pedido muito mais tranquilo.']]
function testimonials(){return `<section class="fcv2-section fcv2-testimonials reveal"><header class="section-title"><span class="section-kicker">EXPERIÊNCIA FOODCOURT</span><h2>Uma experiência pensada para o seu dia.</h2><p>Conheça a plataforma e descubra novos sabores perto de você.</p></header><div>${demoTestimonials.map(x=>`<article><div><i>${x[0]}</i><p><b>${x[1]}</b><span>★★★★★</span></p></div><blockquote>“${x[2]}”</blockquote><small>Exemplo de experiência</small></article>`).join('')}</div></section>`}
function partnerSection(){return `<section class="fcv2-partner reveal" id="parceiros"><div class="fcv2-section"><div><span class="section-kicker light">PARA ESTABELECIMENTOS</span><h2>Seu estabelecimento<br><em>também pode estar aqui.</em></h2><p>Leve seu cardápio para novos clientes e faça parte do FoodCourt.</p><ul><li>Mais visibilidade</li><li>Novos clientes</li><li>Pedidos pela plataforma</li><li>Divulgação de promoções</li><li>Presença digital</li></ul><div><a href="#/cadastro">Quero vender no FoodCourt</a><a href="#/para-estabelecimentos">Conhecer para estabelecimentos</a></div></div><aside><div class="partner-photo" role="img" aria-label="Mesa de restaurante preparada para atendimento"></div><div class="delivery-pack"><b>FOOD<span>COURT</span></b><small>Seu pedido, do seu jeito.</small></div></aside></div></section>`}
function faq(){return `<section class="fcv2-section fcv2-faq reveal" id="duvidas"><header class="section-title"><span class="section-kicker">FAQ</span><h2>Ficou com alguma dúvida?</h2></header><div>${FAQ_ITEMS.map((q,i)=>`<details ${i===0?'open':''}><summary>${q[0]}<i>+</i></summary><p>${q[1]}</p></details>`).join('')}</div></section>`}
function helpWidget(){return `<div class="fcv2-help"><button class="fcv2-help-button" type="button" aria-label="Abrir perguntas frequentes" aria-expanded="false"><span>?</span> Me ajude</button><section class="fcv2-help-panel" role="dialog" aria-label="Central de ajuda" hidden><header><div><small>CENTRAL DE AJUDA</small><h2>Como podemos ajudar?</h2></div><button type="button" class="fcv2-help-close" aria-label="Fechar ajuda">×</button></header><div class="fcv2-help-questions">${FAQ_ITEMS.map(q=>`<details><summary>${q[0]}<i>+</i></summary><p>${q[1]}</p></details>`).join('')}</div></section></div>`}
function finalCta(){return `<section class="fcv2-section final-signup reveal"><span class="food-edge left">◔</span><div><span class="section-kicker light">O PRÓXIMO SABOR ESPERA POR VOCÊ</span><h2>Pronto para descobrir<br>seu próximo favorito?</h2><p>Crie sua conta e tenha o FoodCourt sempre por perto.</p><a href="#/cadastro">CRIAR MINHA CONTA</a><small>É rápido, simples e gratuito.</small></div><span class="food-edge right">◉</span></section>`}
function landingFooter(){return `<footer class="fcv2-footer" id="contato"><div class="footer-main"><div class="footer-about"><a class="footer-brand-logo" href="#/" aria-label="Food Court - início"><img class="brand-logo-image" src="/assets/images/foodcourt-logo.png" alt="Food Court"></a><p>Seu pedido, do seu jeito.</p></div><div><h3>FOODCOURT</h3><button data-scroll="top">Sobre nós</button><button data-scroll="como">Como funciona</button><button data-scroll="vantagens">Vantagens</button><button data-scroll="contato">Contato</button></div><div><h3>DESCUBRA</h3><a href="#/inicio?focus=categorias">Categorias</a><a href="#/ofertas">Ofertas</a><a href="#/buscar">Explorar restaurantes</a></div><div><h3>PARA ESTABELECIMENTOS</h3><a href="#/cadastro-parceiro">Cadastre seu negócio</a><a href="#/para-estabelecimentos">Como funciona</a><a href="#/login-parceiro">Central do parceiro</a></div><div><h3>SUPORTE</h3><a href="#/suporte">Central de ajuda</a><button data-scroll="contato">Fale conosco</button><button data-scroll="duvidas">Dúvidas frequentes</button></div></div><div class="footer-bottom">© ${new Date().getFullYear()} FoodCourt. Todos os direitos reservados.</div></footer>`}
function bind(view,partnerLogin=false,query=new URLSearchParams(),turnstileConfig={enabled:false}){
  const partnerLink = view.querySelector('.fcv2-partner a[href="#/cadastro"]')
  partnerLink?.setAttribute('href', '#/para-estabelecimentos')
  view.querySelectorAll('a[href="#/login"],a[href="#/cadastro"]').forEach(link=>link.addEventListener('click',event=>{
    event.preventDefault()
    const destination=link.getAttribute('href')
    if(location.hash===destination) window.dispatchEvent(new HashChangeEvent('hashchange'))
    else location.hash=destination
  }))
  const root=view.querySelector('.fc-landing-v2')
  root.classList.add('js-reveal')
  window.__fcLandingScrollCleanup?.()
  const nav=view.querySelector('.fcv2-nav'),progress=view.querySelector('.landing-scroll-progress i')
  const onLandingScroll=()=>{if(!root.isConnected)return;const rect=root.getBoundingClientRect(),distance=Math.max(1,root.scrollHeight-innerHeight),amount=Math.min(1,Math.max(0,-rect.top/distance));progress.style.transform=`scaleX(${amount})`;nav.classList.toggle('scrolled',scrollY>36)}
  addEventListener('scroll',onLandingScroll,{passive:true});onLandingScroll();window.__fcLandingScrollCleanup=()=>removeEventListener('scroll',onLandingScroll)
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches){const counters=view.querySelectorAll('.fcv2-proof b,.trust b');const counterObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)return;const element=entry.target,original=element.textContent,match=original.match(/[\d.,]+/);if(!match){counterObserver.unobserve(element);return}const raw=match[0],target=Number(raw.replace(/\./g,'').replace(',','.'));if(!Number.isFinite(target)){counterObserver.unobserve(element);return}const decimal=raw.includes(','),start=performance.now(),duration=900;const tick=now=>{const value=target*Math.min(1,(now-start)/duration),shown=decimal?value.toFixed(1).replace('.',','):Math.round(value).toLocaleString('pt-BR');element.textContent=original.replace(match[0],shown);if(now-start<duration)requestAnimationFrame(tick)};requestAnimationFrame(tick);counterObserver.unobserve(element)}),{threshold:.65});counters.forEach(counter=>counterObserver.observe(counter))}
  if(matchMedia('(hover:hover) and (pointer:fine)').matches&&!matchMedia('(prefers-reduced-motion: reduce)').matches)view.querySelectorAll('.food-mosaic article').forEach(card=>{card.addEventListener('pointermove',event=>{const rect=card.getBoundingClientRect(),px=(event.clientX-rect.left)/rect.width,py=(event.clientY-rect.top)/rect.height;card.style.setProperty('--mosaic-rx',`${(py-.5)*-3}deg`);card.style.setProperty('--mosaic-ry',`${(px-.5)*4}deg`);card.style.setProperty('--mosaic-x',`${px*100}%`);card.style.setProperty('--mosaic-y',`${py*100}%`)});card.addEventListener('pointerleave',()=>{card.style.setProperty('--mosaic-rx','0deg');card.style.setProperty('--mosaic-ry','0deg');card.style.setProperty('--mosaic-x','50%');card.style.setProperty('--mosaic-y','50%')})})
  view.querySelector('.fcv2-menu').addEventListener('click',e=>{const open=view.querySelector('.fcv2-nav').classList.toggle('open');e.currentTarget.setAttribute('aria-expanded',String(open))})
  view.querySelectorAll('[data-scroll]').forEach(b=>b.addEventListener('click',()=>{document.getElementById(b.dataset.scroll)?.scrollIntoView({behavior:'smooth'});view.querySelector('.fcv2-nav').classList.remove('open')}))
  const helpButton=view.querySelector('.fcv2-help-button'),helpPanel=view.querySelector('.fcv2-help-panel'),helpClose=view.querySelector('.fcv2-help-close')
  const setHelpOpen=open=>{helpPanel.hidden=!open;helpButton.setAttribute('aria-expanded',String(open));view.querySelector('.fcv2-help').classList.toggle('open',open);if(open)helpClose.focus()}
  helpButton.addEventListener('click',()=>setHelpOpen(helpPanel.hidden))
  helpClose.addEventListener('click',()=>{setHelpOpen(false);helpButton.focus()})
  helpPanel.addEventListener('keydown',event=>{if(event.key==='Escape'){setHelpOpen(false);helpButton.focus()}})
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{threshold:.08});view.querySelectorAll('.reveal').forEach(section=>observer.observe(section))}else view.querySelectorAll('.reveal').forEach(section=>section.classList.add('visible'))
  const oauthError=query.get('oauth_error'),loginError=view.querySelector('.fcv2-error')
  if(oauthError&&loginError){loginError.textContent=oauthError;loginError.hidden=false}
  view.querySelectorAll('[data-social]').forEach(b=>b.addEventListener('click',()=>{
    const target=partnerLogin?'/parceiro':query.get('redirect')||'/inicio'
    window.location.assign(`/api/auth/oauth/${b.dataset.social}?redirect=${encodeURIComponent(target)}`)
  }))
  view.querySelector('[data-eye]').addEventListener('click',e=>{const input=e.currentTarget.parentElement.querySelector('input');input.type=input.type==='password'?'text':'password'})
  view.querySelector('#landingLogin').addEventListener('submit',async e=>{
    e.preventDefault();const form=e.currentTarget;const error=form.querySelector('.fcv2-error');const submit=form.querySelector('.fcv2-submit');error.hidden=true
    const email=form.email.value.trim(),password=form.password.value
    if(!email||!password){error.textContent='Informe seu e-mail e sua senha.';error.hidden=false;return}
    if(turnstileConfig.enabled&&!turnstileToken){error.textContent='Confirme que você não é um robô para continuar.';error.hidden=false;return}
    submit.disabled=true;submit.textContent='Entrando...'
    try{const res=await api.login({email,password,turnstileToken});if(partnerLogin&&res.user.role!=='merchant'){await api.logout();throw new Error('Esta conta não pertence a um estabelecimento. Entre com a conta do vendedor.')}window.dispatchEvent(new CustomEvent('fc:auth',{detail:res.user}));location.hash=res.user.role==='merchant'?'#/parceiro':res.user.role==='admin'?'#/admin':'#/inicio'}catch(err){error.textContent=err.message;error.hidden=false;submit.disabled=false;submit.textContent=partnerLogin?'Entrar no Portal':'Entrar';if(turnstileConfig.enabled&&window.turnstile&&turnstileWidgetId!==null){turnstileToken='';window.turnstile.reset(turnstileWidgetId)}}
  })
}

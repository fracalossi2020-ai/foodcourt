import { api } from '../core/api.js'
import { store } from '../core/store.js'
import { restaurantCard, productCard, skeletonCards, errorState, bindGotos, greeting, money } from '../core/ui.js'
import { icon, categoryIcon } from '../core/icons.js'
import { filterByCategory, discoveryTitles, validCategory } from '../data/category-discovery.js'

let homeEffectsCleanup=null
let homeSliderTimer=null
export function cleanup(){homeEffectsCleanup?.();homeEffectsCleanup=null;clearInterval(homeSliderTimer);homeSliderTimer=null}

export async function render(view, boot, params = {}, query = new URLSearchParams()) {
  view.innerHTML = `<div class="page consumer-page"><div class="home-intro skeleton-intro"><div class="skel" style="width:280px;height:30px"></div><div class="skel" style="width:190px;height:15px;margin-top:10px"></div></div>${skeletonCards(4)}</div>`
  let data
  try { data = await api.home() } catch { view.innerHTML = `<div class="page">${errorState(() => render(view, boot, params, query))}</div>`; return }

  const selectedCategory = validCategory(query.get('category') || 'all', boot.categories)

  view.innerHTML = `<div class="page consumer-page home-effects-root"><div class="home-scroll-progress" aria-hidden="true"><i></i></div>
    <header class="home-intro home-visual-hero">
      <div class="home-hero-slides" aria-hidden="true"><i class="home-hero-slide home-hero-pasta active"></i><i class="home-hero-slide home-hero-burger"></i><i class="home-hero-slide home-hero-variety"></i></div>
      <div><span class="home-kicker">SABORES PERTO DE VOCÊ</span><h1>${greeting()}, ${firstName(boot.user.fullName || boot.user.name)} <span aria-hidden="true">👋</span></h1>
      <p>Descubra restaurantes, aproveite ofertas e peça o que você ama.</p>
      <div class="home-hero-actions"><a class="btn btn-primary" href="#/buscar">Explorar restaurantes</a><button class="intro-location" data-location-short>${icon('pin')} Entregando em <b>${esc(store.address.label)}</b></button></div></div>
      <div class="home-hero-dots" aria-hidden="true"><i class="active"></i><i></i><i></i></div>
    </header>

    ${sectionHeader('Categorias','Escolha uma categoria para filtrar toda a experiência.','#/buscar','Ver todas')}
    <section class="modern-categories no-scrollbar" aria-label="Categorias de descoberta">
      ${boot.categories.map(category => categoryButton(category, selectedCategory)).join('')}
    </section>

    <div class="category-results" data-category-results aria-live="polite">
      ${discoveryContent(data, selectedCategory)}
    </div>

    ${repeatSection()}
    <section class="consumer-partner-cta"><div><span>PARA ESTABELECIMENTOS</span><h2>Tem um estabelecimento?<br><em>Venda também pelo FoodCourt.</em></h2><p>Leve seu cardápio para novos clientes, receba pedidos pela plataforma e tenha um espaço próprio dentro do FoodCourt.</p><ul><li>✓ Sua loja dentro do FoodCourt</li><li>✓ Cardápio digital</li><li>✓ Recebimento de pedidos</li><li>✓ Painel completo</li></ul><div><a href="#/para-estabelecimentos" target="_blank" rel="noopener noreferrer">QUERO VENDER NO FOODCOURT</a><a href="#/para-estabelecimentos?secao=plano" target="_blank" rel="noopener noreferrer">Conhecer o plano</a></div></div><aside><span>PLANO FOODCOURT</span><strong>R$ 119,90<small>/mês</small></strong><p>Portal completo do estabelecimento.</p></aside></section>
  </div>`

  bindGotos(view)
  bindCategorySelector(view)
  bindHomeEffects(view)
  bindHomeSlider(view)
  view.querySelector('[data-location-short]')?.addEventListener('click', () => document.getElementById('locBtn')?.click())
  view.querySelectorAll('[data-repeat]').forEach(button => button.addEventListener('click', () => {
    const order = store.getOrder(button.dataset.repeat)
    if (!order) return
    store.repeatOrder(order)
    location.hash = `#/restaurante/${order.restaurantId}`
  }))

  requestAnimationFrame(() => view.querySelector('.modern-category.active')?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }))
  if (query.get('focus') === 'categorias') requestAnimationFrame(() => view.querySelector('.modern-categories')?.scrollIntoView({ behavior:'smooth', block:'center' }))
}

function categoryButton(category, selectedCategory) {
  const active = category.id === selectedCategory
  return `<button class="modern-category ${active ? 'active' : ''}" data-category-id="${esc(category.id)}" aria-pressed="${active}"><i>${categoryIcon(category.id)}</i><span>${esc(category.name)}</span></button>`
}

function bindCategorySelector(view) {
  view.querySelectorAll('[data-category-id]').forEach(button => button.addEventListener('click', () => {
    const results=view.querySelector('[data-category-results]');results?.classList.add('category-results-leaving');setTimeout(()=>{location.hash = `#/inicio?category=${encodeURIComponent(button.dataset.categoryId)}`},matchMedia('(prefers-reduced-motion: reduce)').matches?0:170)
  }))
  view.querySelector('[data-clear-category]')?.addEventListener('click', event => {
    event.preventDefault()
    location.hash = '#/inicio'
  })
}

function bindHomeSlider(view) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const slides = [...view.querySelectorAll('.home-hero-slide')]
  const dots = [...view.querySelectorAll('.home-hero-dots i')]
  if (slides.length < 2) return
  let active = 0
  const setSlide = (index) => {
    active = index
    slides.forEach((slide, i) => slide.classList.toggle('active', i === active))
    dots.forEach((dot, i) => dot.classList.toggle('active', i === active))
  }
  const startTimer = () => {
    clearInterval(homeSliderTimer)
    homeSliderTimer = setInterval(() => {
      setSlide((active + 1) % slides.length)
    }, 4500)
  }
  dots.forEach((dot, index) => {
    dot.setAttribute('role', 'button')
    dot.setAttribute('aria-label', `Slide ${index + 1}`)
    dot.addEventListener('click', () => {
      setSlide(index)
      startTimer()
    })
  })
  startTimer()
}

function bindHomeEffects(view){cleanup();const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,root=view.querySelector('.home-effects-root'),hero=view.querySelector('.home-visual-hero'),progress=view.querySelector('.home-scroll-progress i'),help=document.querySelector('.app-global-help');const onScroll=()=>{if(!root||!progress)return;const distance=Math.max(1,root.scrollHeight-innerHeight),value=Math.min(1,Math.max(0,-root.getBoundingClientRect().top/distance));progress.style.transform=`scaleX(${value})`};addEventListener('scroll',onScroll,{passive:true});onScroll();let helpTimer=null;if(!reduce&&hero){hero.addEventListener('pointermove',event=>{const rect=hero.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width,y=(event.clientY-rect.top)/rect.height;hero.style.setProperty('--home-x',`${x*100}%`);hero.style.setProperty('--home-y',`${y*100}%`);hero.style.setProperty('--home-shift-x',`${(x-.5)*8}px`);hero.style.setProperty('--home-shift-y',`${(y-.5)*6}px`)});hero.addEventListener('pointerleave',()=>{hero.style.setProperty('--home-shift-x','0px');hero.style.setProperty('--home-shift-y','0px')})}const cards=view.querySelectorAll('.rcard,.pcard,.offer-card');if(!reduce)cards.forEach(card=>{card.addEventListener('pointermove',event=>{const rect=card.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width,y=(event.clientY-rect.top)/rect.height;card.style.setProperty('--card-rx',`${(y-.5)*-2.2}deg`);card.style.setProperty('--card-ry',`${(x-.5)*3}deg`)});card.addEventListener('pointerleave',()=>{card.style.setProperty('--card-rx','0deg');card.style.setProperty('--card-ry','0deg')})});if(help&&!sessionStorage.getItem('fc:home-help-seen'))helpTimer=setTimeout(()=>{if(!document.body.classList.contains('app-mode'))return;help.classList.add('help-nudge');const bubble=document.createElement('button');bubble.type='button';bubble.className='home-help-bubble';bubble.textContent='Precisa de ajuda para pedir?';bubble.onclick=()=>{help.querySelector('.fcv2-help-button')?.click();bubble.remove()};help.appendChild(bubble);sessionStorage.setItem('fc:home-help-seen','1');setTimeout(()=>bubble.remove(),7000)},3800);homeEffectsCleanup=()=>{removeEventListener('scroll',onScroll);clearTimeout(helpTimer);help?.querySelector('.home-help-bubble')?.remove()}}

function discoveryContent(data, categoryId) {
  const titles = discoveryTitles(categoryId)
  const restaurants = filterByCategory(data.restaurants || [], categoryId)
  const products = filterByCategory(data.products || [], categoryId)
  const offers = filterByCategory(data.offers || [], categoryId)
  const limitedRestaurants = categoryId === 'all' ? restaurants.slice(0, 8) : restaurants
  const limitedProducts = (categoryId === 'all' ? products.filter(product => product.popular) : products).slice(0, 8)
  const limitedOffers = offers.slice(0, 3)

  if (categoryId !== 'all' && !restaurants.length && !products.length && !offers.length) return emptyCategoryState()

  return `<div class="category-results-inner">
    ${sectionHeader(titles.offers,'Promoções selecionadas para esta categoria.')}
    <section class="offer-strip no-scrollbar">${limitedOffers.length ? offerCards(limitedOffers) : emptyInline('Nenhuma oferta encontrada nesta categoria.')}</section>

    ${sectionHeader(titles.restaurants,'Estabelecimentos disponíveis para receber pedidos.','#/buscar','Explorar')}
    <section class="restaurant-row no-scrollbar">${limitedRestaurants.length ? limitedRestaurants.map(restaurant => restaurantCard(restaurant)).join('') : emptyInline('Nenhum estabelecimento encontrado nesta categoria.')}</section>

    ${sectionHeader(titles.products,'Produtos relacionados à sua escolha.')}
    <section class="product-row no-scrollbar">${limitedProducts.length ? limitedProducts.map(product => productCard(product, product.restaurantId, product.restaurantName)).join('') : emptyInline('Nenhum produto encontrado nesta categoria.')}</section>
  </div>`
}

function offerCards(offers) {
  return offers.map((offer, index) => `<article class="offer-card tone-${index % 2 ? 'green' : 'orange'}">
    <i>${icon(offer.type === 'shipping' ? 'bike' : offer.type === 'combo' ? 'tag' : 'percent')}</i>
    <div><b>${esc(offer.title)}</b><span>${esc(offer.description)}</span><em>Oferta disponível</em></div>
  </article>`).join('')
}

function emptyCategoryState() {
  return `<section class="empty-category-state">${icon('search')}<h3>Nenhum resultado nesta categoria</h3><p>Estamos preparando novas opções para você.</p><button class="btn btn-primary" data-clear-category>Ver todas as categorias</button></section>`
}

function sectionHeader(title, subtitle, href = '', label = '', clear = false) {
  const action = clear ? '<a href="#/inicio" data-clear-category>Ver todas ' + icon('chevron') + '</a>' : href ? `<a href="${href}">${label} ${icon('chevron')}</a>` : ''
  return `<header class="consumer-section-head"><div><h2>${title}</h2><p>${subtitle}</p></div>${action}</header>`
}

function repeatSection() {
  const order = store.orders[0]
  return `${sectionHeader('Peça de novo','Seus pedidos recentes, a poucos cliques.')}<section class="repeat-order">${order ? `<div class="repeat-icon">${icon('bag')}</div><div><span>Seu último pedido</span><h3>${esc(order.restaurantName)}</h3><p>${esc(order.summary)}</p><b>${money(order.total)}</b></div><button class="btn btn-primary" data-repeat="${order.id}">Pedir novamente</button>` : `<div class="empty-modern">${icon('bag')}<div><h3>Nenhum pedido recente</h3><p>Quando você fizer seu primeiro pedido, ele aparecerá aqui.</p></div><a href="#/buscar">Explorar restaurantes</a></div>`}</section>`
}

function emptyInline(text) { return `<div class="empty-inline">${icon('store')}<span>${text}</span></div>` }
function firstName(name) { return esc(String(name).trim().split(/\s+/)[0] || 'cliente') }
function esc(value) { return String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[character])) }

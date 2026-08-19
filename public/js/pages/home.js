import { api } from '../core/api.js'
import { store } from '../core/store.js'
import { restaurantCard, productCard, skeletonCards, errorState, bindGotos, greeting, money } from '../core/ui.js'
import { icon, categoryIcon } from '../core/icons.js'
import { filterByCategory, discoveryTitles, validCategory } from '../data/category-discovery.js'

const HOME_FAQ=[['Como encontro restaurantes?','Use as categorias da página inicial ou acesse Buscar para pesquisar restaurantes, pratos e produtos.'],['Como faço um pedido?','Escolha um restaurante, adicione os produtos ao carrinho e siga as etapas de endereço, entrega e pagamento.'],['Como acompanho meu pedido?','Abra a área Pedidos e selecione o pedido atual para visualizar todas as etapas da entrega.'],['Como altero o endereço?','Clique em “Entregando em” no início da página ou use a área Endereços dentro do seu perfil.'],['Onde encontro promoções?','Acesse Ofertas no menu ou confira as promoções exibidas na página inicial.'],['Como falo com o suporte?','Abra seu Perfil e entre em Ajuda e suporte para enviar uma solicitação.']]

export async function render(view, boot, params = {}, query = new URLSearchParams()) {
  view.innerHTML = `<div class="page consumer-page"><div class="home-intro skeleton-intro"><div class="skel" style="width:280px;height:30px"></div><div class="skel" style="width:190px;height:15px;margin-top:10px"></div></div>${skeletonCards(4)}</div>`
  let data
  try { data = await api.home() } catch { view.innerHTML = `<div class="page">${errorState(() => render(view, boot, params, query))}</div>`; return }

  const selectedCategory = validCategory(query.get('category') || 'all', boot.categories)

  view.innerHTML = `<div class="page consumer-page">
    <header class="home-intro">
      <h1>${greeting()}, ${firstName(boot.user.fullName || boot.user.name)} <span aria-hidden="true">👋</span></h1>
      <p>O que vamos pedir hoje?</p>
      <button class="intro-location" data-location-short>${icon('pin')} Entregando em <b>${esc(store.address.label)}</b></button>
    </header>

    ${sectionHeader('Categorias','Escolha uma categoria para filtrar toda a experiência.','','', true)}
    <section class="modern-categories no-scrollbar" aria-label="Categorias de descoberta">
      ${boot.categories.map(category => categoryButton(category, selectedCategory)).join('')}
    </section>

    <div class="category-results" data-category-results aria-live="polite">
      ${discoveryContent(data, selectedCategory)}
    </div>

    ${repeatSection()}
    <section class="consumer-partner-cta"><div><span>PARA ESTABELECIMENTOS</span><h2>Tem um estabelecimento?<br><em>Venda também pelo FoodCourt.</em></h2><p>Leve seu cardápio para novos clientes, receba pedidos pela plataforma e tenha um espaço próprio dentro do FoodCourt.</p><ul><li>✓ Sua loja dentro do FoodCourt</li><li>✓ Cardápio digital</li><li>✓ Recebimento de pedidos</li><li>✓ Painel completo</li></ul><div><a href="#/para-estabelecimentos">QUERO VENDER NO FOODCOURT</a><a href="#/para-estabelecimentos?secao=plano">Conhecer o plano</a></div></div><aside><span>PLANO FOODCOURT</span><strong>R$ 119,90<small>/mês</small></strong><p>Portal completo do estabelecimento.</p></aside></section>
    ${helpWidget()}
  </div>`

  bindGotos(view)
  bindCategorySelector(view)
  view.querySelector('[data-location-short]')?.addEventListener('click', () => document.getElementById('locBtn')?.click())
  bindHelpWidget(view)
  view.querySelectorAll('[data-repeat]').forEach(button => button.addEventListener('click', () => {
    const order = store.getOrder(button.dataset.repeat)
    if (!order) return
    store.repeatOrder(order)
    location.hash = `#/restaurante/${order.restaurantId}`
  }))

  requestAnimationFrame(() => view.querySelector('.modern-category.active')?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }))
  if (query.get('focus') === 'categorias') requestAnimationFrame(() => view.querySelector('.modern-categories')?.scrollIntoView({ behavior:'smooth', block:'center' }))
}

function helpWidget(){return `<div class="fcv2-help"><button class="fcv2-help-button" type="button" aria-label="Abrir perguntas frequentes" aria-expanded="false"><span>?</span> Me ajude</button><section class="fcv2-help-panel" role="dialog" aria-label="Central de ajuda" hidden><header><div><small>CENTRAL DE AJUDA</small><h2>Como podemos ajudar?</h2></div><button type="button" class="fcv2-help-close" aria-label="Fechar ajuda">×</button></header><div class="fcv2-help-questions">${HOME_FAQ.map(item=>`<details><summary>${item[0]}<i>+</i></summary><p>${item[1]}</p></details>`).join('')}</div></section></div>`}

function bindHelpWidget(view){const button=view.querySelector('.fcv2-help-button'),panel=view.querySelector('.fcv2-help-panel'),close=view.querySelector('.fcv2-help-close');const setOpen=open=>{panel.hidden=!open;button.setAttribute('aria-expanded',String(open));view.querySelector('.fcv2-help').classList.toggle('open',open);if(open)close.focus()};button.addEventListener('click',()=>setOpen(panel.hidden));close.addEventListener('click',()=>{setOpen(false);button.focus()});panel.addEventListener('keydown',event=>{if(event.key==='Escape'){setOpen(false);button.focus()}})}

function categoryButton(category, selectedCategory) {
  const active = category.id === selectedCategory
  return `<button class="modern-category ${active ? 'active' : ''}" data-category-id="${esc(category.id)}" aria-pressed="${active}"><i>${categoryIcon(category.id)}</i><span>${esc(category.name)}</span></button>`
}

function bindCategorySelector(view) {
  view.querySelectorAll('[data-category-id]').forEach(button => button.addEventListener('click', () => {
    location.hash = `#/inicio?category=${encodeURIComponent(button.dataset.categoryId)}`
  }))
  view.querySelector('[data-clear-category]')?.addEventListener('click', event => {
    event.preventDefault()
    location.hash = '#/inicio'
  })
}

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
    ${sectionHeader(titles.offers,'Promoções demonstrativas selecionadas para esta categoria.')}
    <section class="offer-strip no-scrollbar">${limitedOffers.length ? offerCards(limitedOffers) : emptyInline('Nenhuma oferta encontrada nesta categoria.')}</section>

    ${sectionHeader(titles.restaurants,'Estabelecimentos fictícios para validar a experiência de descoberta.','#/buscar','Explorar')}
    <section class="restaurant-row no-scrollbar">${limitedRestaurants.length ? limitedRestaurants.map(restaurant => restaurantCard(restaurant)).join('') : emptyInline('Nenhum estabelecimento encontrado nesta categoria.')}</section>

    ${sectionHeader(titles.products,'Produtos de demonstração relacionados à sua escolha.')}
    <section class="product-row no-scrollbar">${limitedProducts.length ? limitedProducts.map(product => productCard(product, product.restaurantId, product.restaurantName)).join('') : emptyInline('Nenhum produto encontrado nesta categoria.')}</section>
  </div>`
}

function offerCards(offers) {
  return offers.map((offer, index) => `<article class="offer-card tone-${index % 2 ? 'green' : 'orange'}">
    <i>${icon(offer.type === 'shipping' ? 'bike' : offer.type === 'combo' ? 'tag' : 'percent')}</i>
    <div><b>${esc(offer.title)}</b><span>${esc(offer.description)}</span><em>Oferta demonstrativa</em></div>
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

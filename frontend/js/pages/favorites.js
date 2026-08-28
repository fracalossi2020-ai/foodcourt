import { api } from '../core/api.js'
import { store } from '../core/store.js'
import { restaurantCard, productCard, emptyState, bindGotos } from '../core/ui.js'

export async function render(view, _boot) {
  view.innerHTML = `<div class="page"><div class="skel" style="height:300px;border-radius:24px"></div></div>`
  const all = await api.search('').catch(() => ({ restaurants: [] }))
  const products = await Promise.all(
    all.restaurants.map(r => api.restaurant(r.id).then(d => d.restaurant).catch(() => null))
  )

  let tab = 'restaurants'
  const allProducts = []
  products.filter(Boolean).forEach(r => r.menu.forEach(s => s.items.forEach(p => {
    allProducts.push({ ...p, restaurantId: r.id, restaurantName: r.name })
  })))

  function draw() {
    const favRests = all.restaurants.filter(r => store.isFavoriteRestaurant(r.id))
    const favProds = allProducts.filter(p => store.isFavoriteProduct(p.id))

    view.innerHTML = `
    <div class="page account-destination-page">
      <a class="profile-back" href="#/perfil">← <span>Voltar ao perfil</span></a>
      <header class="destination-heading"><span class="destination-icon">❤️</span><div><span class="account-kicker">MINHA CONTA</span><h1>Favoritos</h1><p>Todos os sabores que você salvou em um só lugar.</p></div></header>
      <div class="destination-summary"><div><b>${favRests.length}</b><span>Restaurantes</span></div><div><b>${favProds.length}</b><span>Produtos</span></div><a href="#/buscar">Descobrir mais</a></div>
      <div class="tabs modern-tabs">
        <button class="chip ${tab === 'restaurants' ? 'active' : ''}" data-tab="restaurants">🏪 Restaurantes (${favRests.length})</button>
        <button class="chip ${tab === 'products' ? 'active' : ''}" data-tab="products">🍽️ Produtos (${favProds.length})</button>
      </div>
      ${tab === 'restaurants'
        ? (favRests.length
          ? `<div class="grid-rest">${favRests.map(r => restaurantCard(r)).join('')}</div>`
          : emptyState({ emoji: '🤍', title: 'Você ainda não favoritou nenhum restaurante', sub: 'Toque no coração dos cards para salvar seus preferidos e encontrá-los aqui.', action: '#/', actionLabel: 'Explorar restaurantes' }))
        : (favProds.length
          ? `<div class="hscroll no-scrollbar" style="flex-wrap:wrap;overflow:visible;display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px">${favProds.map(p => productCard(p, p.restaurantId, p.restaurantName)).join('')}</div>`
          : emptyState({ emoji: '🤍', title: 'Nenhum produto favoritado', sub: 'Favorite produtos para reencontrá-los rapidinho.', action: '#/buscar', actionLabel: 'Buscar produtos' }))}
    </div>`

    view.querySelectorAll('[data-tab]').forEach(t => t.addEventListener('click', () => { tab = t.dataset.tab; draw() }))
    bindGotos(view)
  }

  draw()
}

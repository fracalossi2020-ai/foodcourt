import { store } from './store.js'
import { esc, money, toast } from './ui.js'
import { show, hide, renderCartUI, flyPlus } from './cart.js'

let drawer

function basePrice(p) { return p.promoPrice ?? p.price }

export function openProduct(restaurant, product) {
  drawer = document.getElementById('productDrawer')
  const sel = new Map()
  let qty = 1
  const note = () => document.getElementById('pdNote')?.value || ''

  drawer.innerHTML = `
    <div class="drawer-head">
      <h3>Personalizar item</h3>
      <button class="icon-btn" data-pd-close aria-label="Fechar">✕</button>
    </div>
    <div class="drawer-body">
      <div class="pd-hero">${product.emoji}</div>
      <h2 style="font-size:1.3rem">${esc(product.name)}</h2>
      <p class="muted text-sm" style="margin:6px 0 4px">${esc(product.description)}</p>
      <div class="pair" style="margin:8px 0 4px">
        <span style="font-weight:800;font-size:1.15rem;color:var(--brand-bright)">${money(basePrice(product))}</span>
        ${product.promoPrice ? `<span class="dim" style="text-decoration:line-through;font-size:.9rem">${money(product.price)}</span>` : ''}
        ${product.popular ? '<span class="badge badge-brand">🔥 Mais pedido</span>' : ''}
      </div>
      <hr class="divider">
      ${product.options.map((g, gi) => `
        <div class="optgroup" data-group="${gi}">
          <div class="optgroup-title">
            <span>${esc(g.name)}</span>
            <span>
              <span class="req">${g.required ? 'Obrigatório' : ''}</span>
              <span class="opt-label">${g.type === 'single' ? 'Escolha 1' : 'Escolha vários'}</span>
            </span>
          </div>
          ${g.choices.map((c, ci) => `
            <div class="optrow ${!g.required && g.type === 'single' && ci === 0 ? '' : ''}" data-g="${gi}" data-c="${ci}" role="${g.type === 'single' ? 'radio' : 'checkbox'}" aria-checked="false" tabindex="0">
              <span class="${g.type === 'single' ? 'radio' : 'check'}"></span>
              <span class="opt-name">${esc(c.name)}</span>
              <span class="opt-price">${c.price ? `+ ${money(c.price)}` : 'Grátis'}</span>
            </div>`).join('')}
        </div>`).join('')}
      <div class="optgroup">
        <div class="optgroup-title"><span>Alguma observação?</span></div>
        <textarea class="textarea" id="pdNote" placeholder="Ex.: sem cebola, ponto da carne, tirar gelo..." maxlength="140"></textarea>
      </div>
      <div class="optgroup">
        <div class="optgroup-title"><span>Quantidade</span></div>
        <div class="qty-stepper">
          <button class="qty-btn" id="pdMinus" aria-label="Diminuir quantidade">−</button>
          <span class="qty-val" id="pdQty">1</span>
          <button class="qty-btn" id="pdPlus" aria-label="Aumentar quantidade">+</button>
        </div>
      </div>
      <div style="height:8px"></div>
    </div>
    <div class="drawer-foot">
      <button class="btn btn-primary btn-lg btn-block" id="pdAdd">ADICIONAR AO CARRINHO</button>
    </div>
  `

  const addBtn = document.getElementById('pdAdd')

  function currentExtra() {
    let extra = 0
    const names = []
    product.options.forEach((g, gi) => {
      const chosen = sel.get(gi)
      if (!chosen) return
      chosen.forEach(ci => { extra += g.choices[ci].price; names.push(g.choices[ci].name) })
    })
    return { extra, names }
  }

  function refreshAdd() {
    const { extra } = currentExtra()
    addBtn.textContent = `ADICIONAR • ${money((basePrice(product) + extra) * qty)}`
  }

  drawer.querySelectorAll('.optrow').forEach(row => {
    const gi = +row.dataset.g
    const ci = +row.dataset.c
    const group = product.options[gi]
    const toggle = () => {
      const cur = sel.get(gi) || new Set()
      if (group.type === 'single') { cur.clear(); cur.add(ci) }
      else cur.has(ci) ? cur.delete(ci) : cur.add(ci)
      sel.set(gi, cur)
      drawer.querySelectorAll(`.optrow[data-g="${gi}"]`).forEach(r => {
        const on = cur.has(+r.dataset.c)
        r.classList.toggle('selected', on)
        r.setAttribute('aria-checked', on)
      })
      refreshAdd()
    }
    row.addEventListener('click', toggle)
    row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle() } })
  })

  document.getElementById('pdMinus').addEventListener('click', () => { qty = Math.max(1, qty - 1); document.getElementById('pdQty').textContent = qty; refreshAdd() })
  document.getElementById('pdPlus').addEventListener('click', () => { qty = Math.min(20, qty + 1); document.getElementById('pdQty').textContent = qty; refreshAdd() })
  drawer.querySelector('[data-pd-close]').addEventListener('click', () => hide('productDrawer'))
  refreshAdd()
  show('productDrawer')

  addBtn.addEventListener('click', () => {
    const missing = product.options.findIndex((g, gi) => g.required && !(sel.get(gi)?.size))
    if (missing >= 0) {
      toast(`Escolha uma opção em “${product.options[missing].name}”`, 'error', '⚠️')
      drawer.querySelector(`[data-group="${missing}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    const { extra, names } = currentExtra()
    const unitPrice = +(basePrice(product) + extra).toFixed(2)
    const uid = [product.id, ...names].join('|') + '|' + note()
    store.cartAdd(restaurant.id, restaurant.name, {
      uid, id: product.id, name: product.name, emoji: product.emoji,
      optionNames: names, note: note(), qty, unitPrice
    })
    flyPlus(addBtn)
    toast(`${qty}× ${product.name} no carrinho`, 'success', '🛒')
    hide('productDrawer')
    renderCartUI()
  })
}

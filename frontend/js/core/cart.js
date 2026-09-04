import { store } from "./store.js";
import { icon } from "./icons.js";
import { el, esc, money, toast } from "./ui.js";

let drawer, overlay;

function ensureEls() {
  drawer = document.getElementById("cartDrawer");
  overlay = document.getElementById("overlay");
}

export function openCart() {
  render();
  show("cartDrawer");
}
export function closeCart() {
  hide("cartDrawer");
}

export function show(id) {
  ensureEls();
  document.getElementById(id).classList.add("open");
  document.getElementById(id).setAttribute("aria-hidden", "false");
  overlay.classList.add("open");
  document.body.style.overflow = "hidden";
}

export function hide(id) {
  ensureEls();
  document.getElementById(id).classList.remove("open");
  document.getElementById(id).setAttribute("aria-hidden", "true");
  if (
    ![...document.querySelectorAll(".drawer.open")].filter((d) => d.id !== id)
      .length
  ) {
    overlay.classList.remove("open");
    document.body.style.overflow = "";
  }
}

export function closeAllDrawers() {
  document.querySelectorAll(".drawer.open").forEach((d) => hide(d.id));
}

let feeCtx = { fee: 0, freeMin: 0 };
export function setFeeContext(fee, freeMin) {
  feeCtx = { fee, freeMin };
}

function render() {
  ensureEls();
  const { cart } = store;
  const restaurantNames = [
    ...new Set(cart.items.map((item) => item.restaurantName)),
  ];
  const restName =
    restaurantNames.length > 1
      ? `${restaurantNames.length} estabelecimentos`
      : restaurantNames[0] || "";
  const t = store.cartTotals(feeCtx.fee, feeCtx.freeMin);

  drawer.innerHTML = `
    <div class="drawer-head">
      <div>
        <h3>Seu carrinho</h3>
        ${restName ? `<div class="text-xs muted">${esc(restName)}</div>` : ""}
      </div>
      <button class="icon-btn" data-close-cart aria-label="Fechar carrinho">${icon("close")}</button>
    </div>
    <div class="drawer-body">
      ${
        cart.items.length === 0
          ? `
        <div class="state-box" style="padding:40px 12px">
          <div class="state-emoji">🛒</div>
          <h3>Carrinho vazio</h3>
          <p>Explore restaurantes e adicione algo gostoso.</p>
          <button class="btn btn-primary" data-goto="#/buscar">Ver restaurantes</button>
        </div>`
          : `
        ${freeShipBar(t.subtotal)}
        ${restaurantNames
          .map(
            (name) =>
              `<section class="cart-store-group"><header>🏪 ${esc(name)}</header>${cart.items
                .filter((item) => item.restaurantName === name)
                .map((i) => itemRow(i))
                .join("")}</section>`,
          )
          .join("")}
        <div style="margin-top:18px">
          <div class="text-sm" style="font-weight:700;margin-bottom:8px">🎟️ Cupom de desconto</div>
          ${
            t.coupon
              ? `<div class="pair"><span class="badge badge-green">✓ ${t.coupon.code} aplicado</span><button class="btn btn-dark btn-sm" data-remove-coupon>Remover</button></div>`
              : `<div class="coupon-row">
                 <input class="coupon-input" id="couponInput" placeholder="DIGITE O CÓDIGO" aria-label="Código do cupom" maxlength="20">
                 <button class="btn btn-ghost btn-sm" data-apply-coupon>Aplicar</button>
               </div>
               <div class="text-xs dim" style="margin-top:7px">Tem cupons disponíveis na <a href="#/ofertas" class="brand-text" data-close-cart>área de ofertas</a>.</div>`
          }
        </div>
        <div class="totals" style="margin-top:18px">
          <div class="totals-row"><span>Subtotal</span><span>${money(t.subtotal)}</span></div>
          <div class="totals-row"><span>Taxa de entrega</span><span class="${t.fee === 0 ? "brand-text" : ""}">${t.fee === 0 ? "Grátis" : money(t.fee)}</span></div>
          ${t.discount ? `<div class="totals-row discount"><span>Desconto (${t.coupon.code})</span><span>-${money(t.discount)}</span></div>` : ""}
          <div class="totals-row total"><span>Total</span><span class="val">${money(t.total)}</span></div>
        </div>`
      }
    </div>
    ${
      cart.items.length
        ? `
      <div class="drawer-foot">
        <a class="btn btn-primary btn-lg btn-block cart-checkout-link" data-checkout href="#/checkout?origem=carrinho&at=${Date.now()}" aria-label="Continuar do carrinho para escolher endereço e pagamento">CONTINUAR PARA PAGAMENTO →</a>
      </div>`
        : ""
    }
  `;

  drawer
    .querySelectorAll("[data-close-cart]")
    .forEach((b) => b.addEventListener("click", closeCart));
  drawer.querySelectorAll("[data-goto]").forEach((b) =>
    b.addEventListener("click", () => {
      closeCart();
      location.hash = b.dataset.goto;
    }),
  );
  drawer.querySelectorAll("[data-qty-minus]").forEach((b) =>
    b.addEventListener("click", () => {
      store.cartUpdateQty(b.dataset.qtyMinus, -1);
      renderCartUI();
    }),
  );
  drawer.querySelectorAll("[data-qty-plus]").forEach((b) =>
    b.addEventListener("click", () => {
      store.cartUpdateQty(b.dataset.qtyPlus, 1);
      renderCartUI();
    }),
  );
  const applyBtn = drawer.querySelector("[data-apply-coupon]");
  if (applyBtn) applyBtn.addEventListener("click", applyCoupon);
  const rmBtn = drawer.querySelector("[data-remove-coupon]");
  if (rmBtn)
    rmBtn.addEventListener("click", () => {
      store.removeLastCoupon();
      renderCartUI();
      render();
    });
  const checkout = drawer.querySelector("[data-checkout]");
  if (checkout) checkout.addEventListener("click", () => closeCart());
}

function applyCoupon() {
  const input = document.getElementById("couponInput");
  const code = (input.value || "").trim().toUpperCase();
  const def = store.couponDefs.find((c) => c.code === code);
  if (!def) {
    toast("Cupom inválido ou expirado", "error", "⚠️");
    return;
  }
  const t = store.cartTotals(feeCtx.fee, feeCtx.freeMin);
  if (t.subtotal < (def.min || 0)) {
    toast(`Pedido mínimo de ${money(def.min)} para este cupom`, "error", "⚠️");
    return;
  }
  store.addCoupon(code);
  toast(`Cupom ${code} aplicado!`, "success", "🎟️");
  render();
}

function freeShipBar(subtotal) {
  if (!feeCtx.freeMin || feeCtx.fee === 0) return "";
  const pct = Math.min(100, (subtotal / feeCtx.freeMin) * 100);
  const missing = feeCtx.freeMin - subtotal;
  return `
  <div class="freeship-bar">
    <div class="freeship-track"><div class="freeship-fill" style="width:${pct}%"></div></div>
    <div class="freeship-label">${missing > 0 ? `Faltam <b>${money(missing)}</b> para você ganhar <b>frete grátis</b> 🚴` : "Você garantiu <b>frete grátis</b> nesta loja! 🎉"}</div>
  </div>`;
}

function itemRow(i) {
  return `
  <div class="cart-item">
    <div class="ci-emoji">${i.emoji}</div>
    <div class="ci-info">
      <div class="ci-name">${esc(i.name)}</div>
      ${i.optionNames?.length ? `<div class="ci-detail">${esc(i.optionNames.join(", "))}</div>` : ""}
      ${i.note ? `<div class="ci-note">“${esc(i.note)}”</div>` : ""}
      <div class="ci-line">
        <div class="qty-stepper" style="transform:scale(.88);transform-origin:left">
          <button class="qty-btn" data-qty-minus="${i.cartKey || i.uid}" aria-label="Diminuir">−</button>
          <span class="qty-val">${i.qty}</span>
          <button class="qty-btn" data-qty-plus="${i.cartKey || i.uid}" aria-label="Aumentar">+</button>
        </div>
        <span class="ci-price">${money(i.unitPrice * i.qty)}</span>
      </div>
    </div>
  </div>`;
}

export function renderCartUI() {
  const n = store.cartCount();
  const dot = document.getElementById("cartDot");
  if (n > 0) {
    dot.hidden = false;
    dot.textContent = n;
    dot.classList.remove("badge-bump");
    void dot.offsetWidth;
    dot.classList.add("badge-bump");
    setTimeout(() => dot.classList.remove("badge-bump"), 450);
  } else dot.hidden = true;

  let bar = document.getElementById("cartbar");
  const routePath = location.hash.replace(/^#/, "").split("?")[0] || "/";
  const isCheckoutFlow =
    routePath === "/checkout" || routePath.startsWith("/pedido/");
  if (isCheckoutFlow) {
    bar?.remove();
    if (drawer && drawer.classList.contains("open")) render();
    return;
  }
  if (n > 0) {
    const t = store.cartTotals(feeCtx.fee, feeCtx.freeMin);
    if (!bar) {
      bar = el(
        `<button class="cartbar" id="cartbar" aria-label="Abrir carrinho"></button>`,
      );
      bar.addEventListener("click", openCart);
      document.body.appendChild(bar);
    }
    const shouldBump = bar.dataset.count && +bar.dataset.count < n;
    bar.dataset.count = n;
    bar.innerHTML = `
      <span class="cb-count">${n}</span>
      <span>Ver carrinho</span>
      <span class="cb-total">${money(t.total)}</span>`;
    if (shouldBump) {
      bar.classList.remove("bump");
      void bar.offsetWidth;
      bar.classList.add("bump");
    }
  } else if (bar) bar.remove();

  if (drawer && drawer.classList.contains("open")) render();
}

export function flyPlus(anchorEl) {
  const r = anchorEl.getBoundingClientRect();
  const f = el(`<span class="plus-fly">+1</span>`);
  f.style.left = r.left + r.width / 2 + "px";
  f.style.top = r.top - 8 + "px";
  document.body.appendChild(f);
  setTimeout(() => f.remove(), 850);
}

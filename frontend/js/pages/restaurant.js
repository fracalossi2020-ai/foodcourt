import { api } from "../core/api.js";
import { store } from "../core/store.js";
import {
  esc,
  money,
  toast,
  skeletonCards,
  errorState,
  ratingPill,
} from "../core/ui.js";
import { openProduct } from "../core/product.js";
import { setFeeContext, renderCartUI } from "../core/cart.js";

const normalize = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export async function render(view, boot, params) {
  view.innerHTML = `<div class="page">${skeletonCards(4, false)}</div>`;
  let data;
  try {
    data = await api.restaurant(params.id);
  } catch {
    view.innerHTML = `<div class="page">${errorState(() => render(view, boot, params))}</div>`;
    return;
  }

  const r = data.restaurant;
  const theme = r.menuTheme || { background: "#f4f8f5", accent: "#07883f" };
  const products = r.menu.flatMap((section) => section.items);
  const productIndex = new Map(
    products.map((product) => [product.id, product]),
  );
  const free = r.deliveryFee === 0;
  const isFav = store.isFavoriteRestaurant(r.id);
  setFeeContext(r.deliveryFee, r.freeShippingMin);
  renderCartUI();

  const sectionsHtml = r.menu
    .map(
      (section, index) => `
    <section class="digital-menu-section" id="menu-${index}" data-menu-section>
      <header><div><span>${String(index + 1).padStart(2, "0")}</span><h2>${esc(section.name)}</h2></div><small>${section.items.length} ${section.items.length === 1 ? "opção" : "opções"}</small></header>
      <div class="digital-product-grid">
        ${
          section.items
            .map(
              (product) => `
          <article class="digital-product" data-product="${product.id}" data-search="${esc(normalize(`${product.name} ${product.description} ${section.name}`))}" role="button" tabindex="0" aria-label="${esc(product.name)}, ${money(product.promoPrice ?? product.price)}">
            <div class="digital-product-photo" ${product.image ? `style="background-image:url('${esc(product.image)}')"` : ""}>
              ${product.image ? "" : `<span>${product.emoji || "🍽️"}</span>`}
              ${product.discount ? `<b>-${product.discount}%</b>` : ""}<button type="button" tabindex="-1" aria-hidden="true">+</button>
            </div>
            <div class="digital-product-info">
              <div class="digital-product-flags">${product.popular ? "<span>🔥 Mais pedido</span>" : ""}${(
                product.dietary || []
              )
                .slice(0, 2)
                .map((tag) => `<span>✓ ${esc(tag)}</span>`)
                .join("")}</div>
              <h3>${esc(product.name)}</h3><p>${esc(product.description || "Preparado especialmente para você.")}</p>
              ${(product.allergens || []).length ? `<small>Contém: ${esc(product.allergens.join(", "))}</small>` : ""}
              <footer><strong>${money(product.promoPrice ?? product.price)}</strong>${product.promoPrice ? `<del>${money(product.price)}</del>` : ""}<i>Personalizar →</i></footer>
            </div>
          </article>`,
            )
            .join("") ||
          '<div class="digital-menu-empty">Novidades desta categoria serão publicadas em breve.</div>'
        }
      </div>
    </section>`,
    )
    .join("");

  view.innerHTML = `
    <div class="page menu-experience" style="--menu-bg:${theme.background};--menu-accent:${theme.accent};--menu-cover:${r.cover}">
      <section class="menu-hero"><div class="menu-hero-cover"></div>
        <div class="menu-hero-actions"><button id="restFav" aria-label="Favoritar">${isFav ? "♥" : "♡"}</button><button id="restShare" aria-label="Compartilhar">↗</button></div>
        <div class="menu-brand-panel"><div class="menu-brand-logo">${r.logo}</div><div><span>${esc(r.category)} · Cardápio digital</span><h1>${esc(r.name)}</h1><div class="menu-store-status ${r.open ? "open" : ""}"><i></i>${r.open ? "Aceitando pedidos agora" : `Fechado${r.opensAt ? ` · abre ${r.opensAt}` : ""}`}</div></div></div>
      </section>
      <section class="menu-service-strip">
        <div>${ratingPill(r)}<small>Avaliação dos clientes</small></div><div><b>${r.deliveryTime[0]}–${r.deliveryTime[1]} min</b><small>Tempo estimado</small></div>
        <div><b>${free ? "Frete grátis" : money(r.deliveryFee)}</b><small>${!free && r.freeShippingMin ? `Grátis acima de ${money(r.freeShippingMin)}` : "Taxa de entrega"}</small></div><div><b>${r.priceRange}</b><small>Faixa de preço</small></div>
      </section>
      ${r.promo ? `<aside class="menu-promo"><span>OFERTA ATIVA</span><b>${esc(r.promo)}</b><small>Aproveite enquanto estiver disponível</small></aside>` : ""}
      ${!r.open ? '<aside class="menu-closed">O cardápio continua disponível para consulta. Você poderá pedir quando a loja abrir.</aside>' : ""}
      <div class="menu-toolbar"><label><span>⌕</span><input id="menuSearch" type="search" placeholder="Buscar neste cardápio..." autocomplete="off"></label>
        <nav class="menu-tabs no-scrollbar" id="menuTabs">${r.menu.map((section, index) => `<button class="${index === 0 ? "active" : ""}" data-tab="${index}">${esc(section.name)}</button>`).join("")}</nav></div>
      <div id="menuNoResults" class="digital-menu-empty" hidden>Nenhum produto encontrado com esse nome.</div><main class="digital-menu">${sectionsHtml}</main>
    </div>`;

  const openItem = (node) => {
    if (!r.open) {
      toast("A loja está fechada no momento.", "error", "◷");
      return;
    }
    openProduct(r, productIndex.get(node.dataset.product));
  };
  view.querySelectorAll("[data-product]").forEach((node) => {
    node.addEventListener("click", () => openItem(node));
    node.addEventListener("keydown", (event) => {
      if (["Enter", " "].includes(event.key)) openItem(node);
    });
  });
  view.querySelector("#restFav").addEventListener("click", (event) => {
    const enabled = store.toggleFavoriteRestaurant(r.id);
    event.currentTarget.textContent = enabled ? "♥" : "♡";
    toast(
      enabled ? "Adicionado aos favoritos" : "Removido dos favoritos",
      "info",
    );
  });
  view.querySelector("#restShare").addEventListener("click", async () => {
    try {
      if (navigator.share)
        await navigator.share({ title: r.name, url: location.href });
      else {
        await navigator.clipboard.writeText(location.href);
        toast("Link do cardápio copiado!", "success");
      }
    } catch {}
  });
  const tabs = [...view.querySelectorAll("#menuTabs button")];
  tabs.forEach((tab) =>
    tab.addEventListener("click", () => {
      tabs.forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");
      view
        .querySelector(`#menu-${tab.dataset.tab}`)
        .scrollIntoView({ behavior: "smooth", block: "start" });
    }),
  );
  view.querySelector("#menuSearch").addEventListener("input", (event) => {
    const query = normalize(event.currentTarget.value.trim());
    let visible = 0;
    view.querySelectorAll("[data-product]").forEach((node) => {
      node.hidden = Boolean(query) && !node.dataset.search.includes(query);
      if (!node.hidden) visible += 1;
    });
    view.querySelectorAll("[data-menu-section]").forEach((section) => {
      section.hidden = !section.querySelector("[data-product]:not([hidden])");
    });
    view.querySelector("#menuNoResults").hidden = visible > 0;
  });
  const sections = [...view.querySelectorAll("[data-menu-section]")];
  const onScroll = () => {
    const position = scrollY + 210;
    let active = 0;
    sections.forEach((section, index) => {
      if (!section.hidden && section.offsetTop <= position) active = index;
    });
    tabs.forEach((tab, index) =>
      tab.classList.toggle("active", index === active),
    );
  };
  window.__menuScrollHandler = onScroll;
  window.addEventListener("scroll", onScroll, { passive: true });
}

export function cleanup() {
  if (window.__menuScrollHandler) {
    window.removeEventListener("scroll", window.__menuScrollHandler);
    window.__menuScrollHandler = null;
  }
}

import { openReview } from '../core/review-editor.js';
import { store } from "../core/store.js";
import { esc, money, emptyState, bindGotos } from "../core/ui.js";
import { repeatOrder } from "../core/reorder.js";
import { api } from "../core/api.js";
import { icon } from "../core/icons.js";

export async function render(view, _boot) {
  const TABS = {
    active: `${icon("package")} Em andamento`,
    past: `${icon("history")} Anteriores`,
  };
  let tab = "active";
  const [serverPayload, reviewPayload] = await Promise.all([api.orders().catch(() => ({ orders: [] })), api.customerReviews().catch(() => ({ reviews: [] }))]);
  const serverOrders = serverPayload.orders.map((order) => ({
    ...order,
    createdAt: new Date(order.createdAt).getTime(),
    dateLabel: new Date(order.createdAt).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    }),
    emoji: "🍔",
    summary: order.items
      .map((item) => `${item.quantity}× ${item.name}`)
      .join(", "),
    restaurantName: order.restaurantName || "Estabelecimento",
    rated: reviewPayload.reviews.some(review => review.orderId === order.id),
  }));
  const allOrders = [
    ...serverOrders,
    ...store.orders.filter(
      (local) => !serverOrders.some((server) => server.id === local.id),
    ),
  ];

  function draw() {

    const active = allOrders.filter(
      (o) =>
        !["delivered", "cancelled"].includes(o.status),
    );
    const past = allOrders.filter(
      (o) =>
        ["delivered", "cancelled"].includes(o.status),
    );
    const list = tab === "active" ? active : past;

    view.innerHTML = `
    <div class="page account-destination-page">
      <a class="profile-back" href="#/perfil">← <span>Voltar ao perfil</span></a>
      <header class="destination-heading"><span class="destination-icon">${icon("package")}</span><div><span class="account-kicker">MINHA CONTA</span><h1>Meus pedidos</h1><p>Acompanhe entregas e peça seus favoritos novamente.</p></div></header>
      <div class="destination-summary"><div><b>${active.length}</b><span>Em andamento</span></div><div><b>${past.length}</b><span>Finalizados</span></div><a href="#/inicio">+ Novo pedido</a></div>
      <div class="tabs modern-tabs">
        ${Object.entries(TABS)
          .map(
            ([k, label]) =>
              `<button class="chip ${tab === k ? "active" : ""}" data-tab="${k}">${label}${k === "active" && active.length ? ` (${active.length})` : ""}</button>`,
          )
          .join("")}
      </div>
      <div id="ordersList">
        ${
          list.length === 0
            ? emptyState(
                tab === "active"
                  ? {
                      emoji: "🛍️",
                      title: "Nenhum pedido em andamento",
                      sub: "Que tal pedir algo agora? Tem ofertas esperando por você.",
                      action: "#/",
                      actionLabel: "Fazer um pedido",
                    }
                  : {
                      emoji: "📦",
                      title: "Você ainda não fez nenhum pedido",
                      sub: "Seu histórico de pedidos aparecerá aqui.",
                      action: "#/",
                      actionLabel: "Explorar restaurantes",
                    },
              )
            : list.map(orderCard).join("")
        }
      </div>
    </div>`;

    view.querySelectorAll("[data-tab]").forEach((t) =>
      t.addEventListener("click", () => {
        tab = t.dataset.tab;
        draw();
      }),
    );
    bindGotos(view);
    view.querySelectorAll("[data-repeat]").forEach((b) =>
      b.addEventListener("click", () => {
        const order = allOrders.find((item) => item.id === b.dataset.repeat);
        if (!order) return;
        repeatOrder(order, b);
      }),
    );
    view.querySelectorAll("[data-rate]").forEach((b) =>
      b.addEventListener("click", () => {
        const order = allOrders.find((item) => item.id === b.dataset.rate);
        if (!order) return;
        openReview(order, () => { order.rated = true; draw(); });
      }),
    );
  }

  function orderCard(o) {
    const active = !["delivered", "cancelled"].includes(o.status);
    return `
    <div class="card order-card">
      <div class="order-head">
        <div class="order-logo">${o.emoji}</div>
        <div class="oh-main">
          <b>${esc(o.restaurantName)}</b>
          <div class="text-xs dim">${esc(o.dateLabel)} • #${esc(o.id)}</div>
        </div>
        <span class="badge ${active ? "badge-brand" : "badge-dark"}">${o.status === "cancelled" ? "Cancelado" : active ? o.paymentStatus !== "paid" ? "Aguardando pagamento" : "🛵 Em andamento" : "✓ Entregue"}</span>
      </div>
      <div class="order-items">${esc(o.summary)}</div>
      ${o.paymentIntentId ? `<a class="btn btn-outline btn-sm" href="#/checkout?payment=${encodeURIComponent(o.paymentIntentId)}">Ver pagamento</a>` : ""}
      <div class="order-foot">
        <b>${money(o.total)}</b>
        <div class="pair">
          ${
            active
              ? `<a class="btn btn-primary btn-sm" href="#/pedido/${o.id}">Acompanhar 📍</a>`
              : `<button class="btn btn-primary btn-sm" data-repeat="${o.id}">↻ Pedir novamente</button>
               ${
                 o.status !== "delivered" ? "" : o.rated
                   ? '<span class="badge badge-green">Avaliado ✓</span>'
                   : `<button class="btn btn-ghost btn-sm" data-rate="${o.id}">⭐ Avaliar</button>`
               }`
          }
          <a class="btn btn-dark btn-sm" href="#/pedido/${o.id}">Detalhes</a>
        </div>
      </div>
    </div>`;
  }

  draw();
}

import { api } from "../core/api.js";
import { esc, money, toast } from "../core/ui.js";

const actionFor = (delivery) =>
  ({
    accepted: ["pickup", "Confirmar coleta"],
    picked_up: ["start", "Iniciar entrega"],
    out_for_delivery: ["deliver", "Confirmar entrega"],
  })[delivery.status];
const place = (value) =>
  typeof value === "string"
    ? value
    : [value?.street, value?.number, value?.neighborhood, value?.city]
        .filter(Boolean)
        .join(", ");
const payoutLabel = {
  pending: "Em análise",
  paid: "Pago",
  rejected: "Recusado",
};

export async function render(view) {
  view.innerHTML =
    '<div class="partner-loading">Carregando Portal do Entregador...</div>';
  try {
    const data = await api.courierDashboard();
    const current = data.current;
    const withdrawals =
      data.withdrawals
        .map(
          (item) =>
            `<div class="admin-row"><span>💸</span><div><b>${money(item.amount)}</b><small>Solicitado em ${new Date(item.requestedAt).toLocaleString("pt-BR")} · Pix ${esc(item.pixKey)}</small></div><em>${payoutLabel[item.status] || esc(item.status)}</em></div>`,
        )
        .join("") || '<p class="partner-empty">Nenhum saque solicitado.</p>';
    view.innerHTML = `<div class="page admin-page courier-page"><header class="admin-head"><div><span>FOODCOURT ENTREGAS</span><h1>Olá, ${esc(data.profile.name.split(" ")[0])}</h1><p>Gerencie disponibilidade, corridas e ganhos em uma área exclusiva.</p></div><button class="btn ${data.profile.available ? "btn-primary" : "btn-outline"}" data-availability>${data.profile.available ? "● Disponível" : "Ficar disponível"}</button></header><section class="partner-metrics"><article class="partner-metric"><i>💰</i><span>Ganhos totais</span><b>${money(data.earnings)}</b><small>entregas concluídas</small></article><article class="partner-metric"><i>🏦</i><span>Saldo disponível</span><b>${money(data.availableBalance)}</b><small>livre para saque</small></article><article class="partner-metric"><i>⭐</i><span>Avaliação</span><b>${data.profile.rating.toFixed(1)}</b><small>qualidade do serviço</small></article><article class="partner-metric"><i>🛵</i><span>Veículo</span><b>${esc(data.profile.vehicle)}</b><small>modalidade cadastrada</small></article></section>${current ? `<section class="partner-panel"><header><h2>Entrega atual</h2><em>${esc(current.status)}</em></header><div class="courier-route"><article><small>RETIRADA</small><b>${esc(place(current.pickupAddress) || "Estabelecimento")}</b></article><span>→</span><article><small>ENTREGA</small><b>${esc(place(current.dropoffAddress) || "Endereço do cliente")}</b></article></div><div class="pair">${actionFor(current) ? `<button class="btn btn-primary" data-delivery-action="${actionFor(current)[0]}" data-delivery-id="${current.id}">${actionFor(current)[1]}</button>` : ""}<a class="btn btn-outline" href="#/conversa/${current.orderId}">Conversar</a></div></section>` : ""}<section class="partner-panel"><header><h2>Corridas disponíveis</h2><span>${data.available.length}</span></header>${data.available.length ? data.available.map((item) => `<div class="admin-row"><span>📦</span><div><b>${esc(place(item.dropoffAddress) || "Nova entrega")}</b><small>Retirada em ${esc(place(item.pickupAddress) || "estabelecimento")}</small></div><strong>${money(item.courierPayout)}</strong><button class="btn btn-primary btn-sm" data-delivery-action="accept" data-delivery-id="${item.id}">Aceitar</button></div>`).join("") : '<p class="partner-empty">Fique disponível para receber novas corridas.</p>'}</section><section class="partner-panel"><header><h2>Saques via Pix</h2><button class="btn btn-primary btn-sm" data-withdraw ${data.availableBalance < 10 ? "disabled" : ""}>Solicitar saque</button></header>${withdrawals}</section><section class="partner-panel"><header><h2>Histórico de entregas</h2></header>${data.history.map((item) => `<div class="admin-row"><span>✓</span><div><b>${esc(item.orderId)}</b><small>${new Date(item.updatedAt).toLocaleString("pt-BR")}</small></div><strong>${money(item.courierPayout)}</strong></div>`).join("") || '<p class="partner-empty">As entregas concluídas aparecerão aqui.</p>'}</section></div>`;
    view
      .querySelector("[data-availability]")
      ?.addEventListener("click", async (event) => {
        const button = event.currentTarget;
        button.disabled = true;
        try {
          await api.setCourierAvailability(!data.profile.available);
          toast("Disponibilidade atualizada.", "success");
          location.hash = `#/entregador?at=${Date.now()}`;
        } catch (error) {
          toast(error.message, "error");
          button.disabled = false;
        }
      });
    view.querySelectorAll("[data-delivery-action]").forEach((button) =>
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          await api.updateCourierDelivery(
            button.dataset.deliveryId,
            button.dataset.deliveryAction,
          );
          toast("Entrega atualizada.", "success");
          location.hash = `#/entregador?at=${Date.now()}`;
        } catch (error) {
          toast(error.message, "error");
          button.disabled = false;
        }
      }),
    );
    view
      .querySelector("[data-withdraw]")
      ?.addEventListener("click", async (event) => {
        const amount = prompt(
          `Valor do saque (saldo ${money(data.availableBalance)}):`,
          data.availableBalance.toFixed(2),
        );
        if (!amount) return;
        const pixKey = prompt("Informe sua chave Pix:");
        if (!pixKey) return;
        event.currentTarget.disabled = true;
        try {
          await api.requestCourierWithdrawal(
            Number(amount.replace(",", ".")),
            pixKey,
          );
          toast(
            "Saque solicitado. O administrador fará a conferência.",
            "success",
          );
          location.hash = `#/entregador?at=${Date.now()}`;
        } catch (error) {
          toast(error.message, "error");
          event.currentTarget.disabled = false;
        }
      });
  } catch (error) {
    view.innerHTML = `<div class="state-box"><div class="state-emoji">🛵</div><h3>Portal do Entregador</h3><p>${esc(error.message)}</p><a class="btn btn-primary" href="#/inicio">Voltar</a></div>`;
  }
}

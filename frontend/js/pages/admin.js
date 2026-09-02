import { api } from "../core/api.js";
import { esc, money, toast } from "../core/ui.js";

const tabs = [
  ["visao", "Visão geral"],
  ["lojas", "Estabelecimentos"],
  ["entregadores", "Entregadores"],
  ["entregas", "Entregas"],
  ["pagamentos", "Pagamentos"],
  ["auditoria", "Auditoria"],
];
const labels = {
  active: "Ativo",
  pending: "Pendente",
  suspended: "Suspenso",
  searching: "Procurando entregador",
  accepted: "Aceita",
  picked_up: "Coletada",
  out_for_delivery: "Em rota",
  delivered: "Entregue",
  cancelled: "Cancelada",
  paid: "Pago",
  failed: "Falhou",
  refund_pending: "Estorno pendente",
  rejected: "Rejeitado",
};
const empty = (text) => `<p class="partner-empty">${text}</p>`;
const storeRows = (data) =>
  data.stores
    .map(
      (store) =>
        `<div class="admin-row"><span>🏪</span><div><b>${esc(store.name)}</b><small>${esc(store.category || "Estabelecimento")} · ${esc(store.address?.city || "Endereço pendente")}</small></div><em>${labels[store.status] || esc(store.status)}</em><select class="input admin-action" data-store-status="${store.id}" aria-label="Alterar situação de ${esc(store.name)}"><option value="pending" ${store.status === "pending" ? "selected" : ""}>Pendente</option><option value="active" ${store.status === "active" ? "selected" : ""}>Aprovar</option><option value="suspended" ${store.status === "suspended" ? "selected" : ""}>Suspender</option></select></div>`,
    )
    .join("") || empty("Nenhum estabelecimento cadastrado.");
const courierRows = (data) =>
  data.couriers
    .map(
      (user) =>
        `<div class="admin-row"><span>🛵</span><div><b>${esc(user.fullName)}</b><small>${esc(user.email)} · ${esc(user.vehicle)} · ${user.deliveries} concluídas</small></div><em>${user.available ? "Disponível" : "Indisponível"}</em><button class="btn btn-outline btn-sm" data-disable-courier="${esc(user.email)}">Desativar</button></div>`,
    )
    .join("") || empty("Nenhum entregador habilitado.");
const deliveryRows = (data) =>
  data.deliveries
    .map(
      (item) =>
        `<div class="admin-row"><span>📦</span><div><b>${esc(item.orderId)} · ${esc(item.storeName || "Estabelecimento")}</b><small>${esc(item.courierName || "Aguardando entregador")} · ${new Date(item.updatedAt).toLocaleString("pt-BR")}</small></div><em>${labels[item.status] || esc(item.status)}</em></div>`,
    )
    .join("") || empty("Nenhuma entrega registrada.");
const paymentRows = (data) =>
  data.payments
    .map(
      (payment) =>
        `<div class="admin-row"><span>💳</span><div><b>${money(payment.amount)} · ${esc(payment.method || "Pagamento")}</b><small>${esc(payment.customerEmail || "Conta não localizada")} · ${esc(payment.txid || payment.id)} · ${new Date(payment.updatedAt || payment.createdAt).toLocaleString("pt-BR")}</small></div><em>${labels[payment.status] || esc(payment.status)}</em></div>`,
    )
    .join("") || empty("Nenhuma cobrança registrada.");

export async function render(view) {
  view.innerHTML =
    '<div class="partner-loading">Carregando administração...</div>';
  try {
    const data = await api.adminDashboard();
    const query = new URLSearchParams(location.hash.split("?")[1] || "");
    const section = tabs.some(([id]) => id === query.get("secao"))
      ? query.get("secao")
      : "visao";
    const metrics = `<section class="partner-metrics"><article class="partner-metric"><i>👥</i><span>Usuários</span><b>${data.metrics.users}</b><small>contas cadastradas</small></article><article class="partner-metric"><i>🏪</i><span>Lojas pendentes</span><b>${data.metrics.pendingStores}</b><small>${data.metrics.stores} lojas no total</small></article><article class="partner-metric"><i>🛵</i><span>Entregadores</span><b>${data.metrics.couriers}</b><small>${data.metrics.activeDeliveries} entregas ativas</small></article><article class="partner-metric"><i>💰</i><span>Volume bruto</span><b>${money(data.metrics.gross)}</b><small>${data.metrics.orders} pedidos</small></article></section>`;
    const audit =
      data.audit
        .map(
          (item) =>
            `<div class="audit-row"><i>${item.role === "admin" ? "🛡️" : "•"}</i><div><b>${esc(item.action)}</b><small>${esc(item.entityType)} · ${new Date(item.at).toLocaleString("pt-BR")}</small></div></div>`,
        )
        .join("") || empty("As ações operacionais aparecerão aqui.");
    const content =
      section === "lojas"
        ? `<section class="partner-panel"><header><h2>Gerenciar estabelecimentos</h2><a href="#/cadastro-parceiro">+ Novo parceiro</a></header>${storeRows(data)}</section>`
        : section === "entregadores"
          ? `<section class="partner-panel"><header><h2>Gerenciar entregadores</h2><button class="btn btn-primary btn-sm" data-new-courier>Habilitar conta</button></header>${courierRows(data)}</section>`
          : section === "entregas"
            ? `<section class="partner-panel"><header><h2>Operação de entregas</h2><span>${data.deliveries.length} registros</span></header>${deliveryRows(data)}</section>`
            : section === "pagamentos"
              ? `<section class="partner-metrics"><article class="partner-metric"><i>✅</i><span>Pagamentos aprovados</span><b>${money(data.metrics.paidPayments)}</b><small>valor confirmado pelo provedor</small></article><article class="partner-metric"><i>⏳</i><span>Pendências</span><b>${data.metrics.pendingPayments}</b><small>pagamentos ou estornos aguardando</small></article></section><section class="partner-panel"><header><h2>Movimentações financeiras</h2><span>${data.payments.length} registros</span></header>${paymentRows(data)}</section>`
            : section === "auditoria"
              ? `<section class="partner-panel"><header><h2>Auditoria recente</h2></header>${audit}</section>`
              : `${metrics}<div class="partner-columns"><section class="partner-panel"><header><h2>Lojas que precisam de análise</h2><a href="#/admin?secao=lojas">Ver todas →</a></header>${storeRows({ ...data, stores: data.stores.filter((store) => store.status === "pending").slice(0, 5) })}</section><section class="partner-panel"><header><h2>Auditoria recente</h2><a href="#/admin?secao=auditoria">Abrir →</a></header>${audit}</section></div>`;
    view.innerHTML = `<div class="admin-page"><header class="admin-head"><div><span>FOODCOURT CONTROL</span><h1>Administração da plataforma</h1><p>Cada operação em sua área, com permissões e auditoria.</p></div><a class="btn btn-dark" href="#/perfil">Minha conta</a></header><nav class="partner-quick-actions admin-tabs" aria-label="Seções administrativas">${tabs.map(([id, label]) => `<a class="${section === id ? "active" : ""}" href="#/admin?secao=${id}">${label}</a>`).join("")}</nav>${content}</div>`;
    view.querySelectorAll("[data-store-status]").forEach((select) =>
      select.addEventListener("change", async () => {
        select.disabled = true;
        try {
          await api.updateAdminStoreStatus(
            select.dataset.storeStatus,
            select.value,
          );
          toast("Situação do estabelecimento atualizada.", "success");
          location.hash = `#/admin?secao=lojas&at=${Date.now()}`;
        } catch (error) {
          toast(error.message, "error");
          select.disabled = false;
        }
      }),
    );
    view
      .querySelector("[data-new-courier]")
      ?.addEventListener("click", async () => {
        const email = prompt(
          "E-mail da conta que será habilitada como entregador:",
        );
        if (!email) return;
        const vehicle = prompt(
          "Veículo (ex.: Moto, Bicicleta ou Carro):",
          "Moto",
        );
        if (!vehicle) return;
        try {
          await api.updateAdminCourier({ email, vehicle, action: "enable" });
          toast("Conta habilitada como entregador.", "success");
          location.hash = `#/admin?secao=entregadores&at=${Date.now()}`;
        } catch (error) {
          toast(error.message, "error");
        }
      });
    view.querySelectorAll("[data-disable-courier]").forEach((button) =>
      button.addEventListener("click", async () => {
        if (
          !confirm(
            "Desativar este entregador? A conta continuará funcionando como cliente.",
          )
        )
          return;
        button.disabled = true;
        try {
          await api.updateAdminCourier({
            email: button.dataset.disableCourier,
            action: "disable",
          });
          toast("Entregador desativado.", "success");
          location.hash = `#/admin?secao=entregadores&at=${Date.now()}`;
        } catch (error) {
          toast(error.message, "error");
          button.disabled = false;
        }
      }),
    );
  } catch (error) {
    view.innerHTML = `<div class="state-box"><div class="state-emoji">🛡️</div><h3>Acesso administrativo</h3><p>${esc(error.message)}</p><a class="btn btn-primary" href="#/login">Entrar como administrador</a></div>`;
  }
}

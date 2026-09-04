import { api } from "../core/api.js";
import { esc, money, toast } from "../core/ui.js";

const tabs = [
  ["visao", "Visão geral"],
  ["usuarios", "Usuários"],
  ["lojas", "Estabelecimentos"],
  ["entregadores", "Entregadores"],
  ["pedidos", "Pedidos"],
  ["entregas", "Entregas"],
  ["pagamentos", "Pagamentos"],
  ["suporte", "Suporte"],
  ["auditoria", "Auditoria"],
  ["sistema", "Sistema"],
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
const auditActions = {
  "store.update": "Estabelecimento atualizado",
  "store.active": "Estabelecimento aprovado",
  "store.pending": "Estabelecimento enviado para análise",
  "store.suspended": "Estabelecimento suspenso",
  "order.create": "Pedido criado",
  "order.status": "Status do pedido alterado",
  "order.cancel": "Pedido cancelado",
  "support.create": "Chamado de suporte aberto",
  "support.reply": "Resposta enviada no suporte",
  "support.resolve": "Chamado de suporte resolvido",
  "user.active": "Conta reativada",
  "user.suspended": "Conta suspensa",
  "courier.application.submit": "Cadastro de entregador enviado",
  "courier.application.approved": "Entregador aprovado",
  "courier.application.rejected": "Cadastro de entregador recusado",
  "courier.withdrawal.request": "Saque solicitado",
  "courier.payout.paid": "Saque do entregador pago",
  "courier.payout.rejected": "Saque do entregador recusado",
  "delivery.offer": "Entrega oferecida ao entregador",
  "delivery.accept": "Entrega aceita",
  "delivery.pickup": "Pedido coletado",
  "delivery.start": "Entrega iniciada",
  "delivery.deliver": "Entrega concluída",
};
const entityLabels = {
  store: "Estabelecimento",
  user: "Usuário",
  order: "Pedido",
  delivery: "Entrega",
  ticket: "Atendimento",
  payout: "Pagamento",
  product: "Produto",
  promotion: "Promoção",
  review: "Avaliação",
  member: "Equipe",
  coupon: "Cupom",
};
const iconPaths = {
  overview: '<path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>',
  users:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  stores:
    '<path d="M3 9l2-6h14l2 6M5 13v8h14v-8M9 21v-6h6v6M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/>',
  courier:
    '<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M9 17.5h6M15 17.5l-3-8H8M12 9.5l4-3M17 6.5h3"/>',
  orders: '<path d="M6 2h9l5 5v15H6zM14 2v6h6M9 13h8M9 17h8"/>',
  delivery:
    '<path d="M3 6h11v11H3zM14 10h4l3 4v3h-7z"/><circle cx="7" cy="19" r="2"/><circle cx="18" cy="19" r="2"/>',
  payments:
    '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
  support:
    '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>',
  audit: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1V21h-4v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1-.4H3v-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1V3h4v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.18.37.39.69.6 1 .27.4.61.6 1 .6h.09v4H21c-.4 0-.73.2-1 .4z"/>',
};
const adminIcon = (name) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name]}</svg>`;
const empty = (text) => `<p class="partner-empty">${text}</p>`;
const storeRows = (data) =>
  data.stores
    .map(
      (store) =>
        `<div class="admin-row"><span>🏪</span><div><b>${esc(store.name)}</b><small>Dono: ${esc(store.owner?.fullName || "Não vinculado")} · ${esc(store.owner?.email || "sem e-mail")}</small><small>${esc(store.category || "Estabelecimento")} · ${esc(store.address?.city || "Endereço pendente")} · ${store.productCount} produtos · ${store.orderCount} pedidos · ${money(store.revenue)}</small></div><em>${labels[store.status] || esc(store.status)}</em><select class="input admin-action" data-store-status="${store.id}" aria-label="Alterar situação de ${esc(store.name)}"><option value="pending" ${store.status === "pending" ? "selected" : ""}>Pendente</option><option value="active" ${store.status === "active" ? "selected" : ""}>Aprovar</option><option value="suspended" ${store.status === "suspended" ? "selected" : ""}>Suspender</option></select></div>`,
    )
    .join("") || empty("Nenhum estabelecimento cadastrado.");
const courierRows = (data) =>
  data.couriers
    .map(
      (user) =>
        `<div class="admin-row"><span>🛵</span><div><b>${esc(user.fullName)}</b><small>${esc(user.email)} · ${esc(user.vehicle)} · ${user.deliveries} concluídas</small></div><em>${user.available ? "Disponível" : "Indisponível"}</em><button class="btn btn-outline btn-sm" data-disable-courier="${esc(user.email)}">Desativar</button></div>`,
    )
    .join("") || empty("Nenhum entregador habilitado.");
const courierApplicationRows = (data) =>
  data.courierApplications
    .map(
      (application) =>
        `<div class="admin-row courier-review-row"><span>📋</span><div><b>${esc(application.user?.fullName || "Conta não encontrada")}</b><small>${esc(application.user?.email || "")} · ${esc(application.vehicle)} · ${esc(application.city)} · Documento final ${esc(application.document.slice(-4))}</small><small>Prazo da análise: ${application.reviewDueAt ? new Date(application.reviewDueAt).toLocaleString("pt-BR") : "até 3 dias"}</small><details><summary>Ver critérios e documentos</summary><p>✓ Identidade e selfie enviadas<br>${application.vehicle === "Moto" ? `${application.cnhCategory?.includes("A") ? "✓" : "✕"} CNH A · ${application.ear ? "✓ EAR" : "✕ EAR"} · ${application.motofreteCourse ? "✓ curso motofrete" : "✕ curso motofrete"}` : application.vehicle === "Carro" ? "✓ CNH informada" : "✓ documento de identidade para bicicleta"}</p><a href="${application.identityImage}" target="_blank" rel="noopener">Abrir documento</a> · <a href="${application.selfieImage}" target="_blank" rel="noopener">Abrir selfie</a></details></div><em>${application.status === "pending" ? "Em análise" : application.status === "approved" ? "Aprovado" : "Recusado"}</em>${application.status === "pending" ? `<button class="btn btn-primary btn-sm" data-courier-application="${application.id}" data-application-action="approve">Aprovar</button><button class="btn btn-ghost btn-sm" data-courier-application="${application.id}" data-application-action="reject">Recusar</button>` : ""}</div>`,
    )
    .join("") || empty("Nenhum cadastro recebido.");
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
const payoutRows = (data) =>
  data.courierPayouts
    .map(
      (payout) =>
        `<div class="admin-row"><span>💸</span><div><b>${money(payout.netAmount ?? payout.amount)} líquido · ${esc(payout.courierName)}</b><small>Bruto ${money(payout.amount)} · taxa FoodCourt ${money(payout.platformFee || 0)} · Pix ${esc(payout.pixKey)}</small></div><em>${labels[payout.status] || esc(payout.status)}</em>${payout.status === "pending" ? `<button class="btn btn-primary btn-sm" data-payout="${payout.id}" data-payout-status="paid">Marcar pago</button><button class="btn btn-ghost btn-sm" data-payout="${payout.id}" data-payout-status="rejected">Recusar</button>` : ""}</div>`,
    )
    .join("") || empty("Nenhum saque solicitado.");
const supportRows = (data) =>
  data.tickets
    .map(
      (ticket) =>
        `<article class="ticket-row"><span>#${esc(ticket.id.split("_").pop())}</span><div><b>${esc(ticket.subject)} · ${esc(ticket.requester)}</b><small>${esc(ticket.messages.at(-1)?.text || "Sem mensagens")} · ${ticket.priority || "normal"}</small></div><em>${ticket.status === "open" ? "Aberto" : "Resolvido"}</em><button class="btn btn-outline btn-sm" data-support-reply="${ticket.id}">Responder</button><button class="btn btn-ghost btn-sm" data-support-action="${ticket.status === "open" ? "resolve" : "reopen"}" data-ticket-id="${ticket.id}">${ticket.status === "open" ? "Resolver" : "Reabrir"}</button></article>`,
    )
    .join("") || empty("Nenhum chamado registrado.");
const userRows = (data) =>
  data.users
    .map(
      (user) =>
        `<div class="admin-row"><span>${user.role === "admin" ? "🛡️" : user.role === "merchant" ? "🏪" : user.role === "courier" ? "🛵" : "👤"}</span><div><b>${esc(user.fullName)}</b><small>${esc(user.email)} · ${esc(user.phone || "sem telefone")} · ${esc(user.role)}</small></div><em>${labels[user.status] || esc(user.status)}</em>${user.role !== "admin" ? `<button class="btn btn-outline btn-sm" data-user-status="${user.id}" data-next-status="${user.status === "suspended" ? "active" : "suspended"}">${user.status === "suspended" ? "Reativar" : "Suspender"}</button>` : ""}</div>`,
    )
    .join("") || empty("Nenhum usuário cadastrado.");
const orderRows = (data) =>
  data.orders
    .map(
      (order) =>
        `<div class="admin-row"><span>🧾</span><div><b>${esc(order.id)} · ${esc(order.storeName)}</b><small>${esc(order.customerName)} · ${order.items?.length || 0} itens · ${new Date(order.createdAt).toLocaleString("pt-BR")}</small></div><strong>${money(order.total)}</strong><em>${labels[order.status] || esc(order.status)}</em></div>`,
    )
    .join("") || empty("Nenhum pedido registrado.");

export async function render(view) {
  document.body.classList.add("admin-mode");
  view.innerHTML =
    '<div class="partner-loading">Carregando administração...</div>';
  try {
    const data = await api.adminDashboard();
    const query = new URLSearchParams(location.hash.split("?")[1] || "");
    const section = tabs.some(([id]) => id === query.get("secao"))
      ? query.get("secao")
      : "visao";
    const metrics = `<section class="admin-kpis"><article><i>${adminIcon("users")}</i><span>Usuários</span><b>${data.metrics.users}</b><small>${data.metrics.customers} clientes · ${data.metrics.merchants} donos</small></article><article><i>${adminIcon("stores")}</i><span>Estabelecimentos</span><b>${data.metrics.stores}</b><small>${data.metrics.pendingStores} aguardando análise</small></article><article><i>${adminIcon("courier")}</i><span>Entregadores</span><b>${data.metrics.couriers}</b><small>${data.metrics.pendingCourierApplications} cadastros pendentes</small></article><article><i>${adminIcon("orders")}</i><span>Pedidos</span><b>${data.metrics.orders}</b><small>${data.metrics.activeDeliveries} entregas ativas</small></article><article><i>${adminIcon("payments")}</i><span>Volume bruto</span><b>${money(data.metrics.gross)}</b><small>movimentado em pedidos</small></article><article><i>${adminIcon("audit")}</i><span>Receita FoodCourt</span><b>${money(data.metrics.platformRevenue)}</b><small>taxas confirmadas</small></article></section>`;
    const audit =
      data.audit
        .map((item) => {
          const label =
            auditActions[item.action] || item.action.split(".").join(" ");
          const entity = entityLabels[item.entityType] || item.entityType;
          const initials = (item.actorName || "FC")
            .split(" ")
            .slice(0, 2)
            .map((part) => part[0])
            .join("")
            .toUpperCase();
          return `<article class="admin-audit-item"><span>${esc(initials)}</span><div><b>${esc(label)}</b><p><strong>${esc(entity)}</strong> · ${esc(item.entityName || item.entityId)}</p><small>Por ${esc(item.actorName || "Sistema FoodCourt")} · ${new Date(item.at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</small></div><i></i></article>`;
        })
        .join("") || empty("As ações operacionais aparecerão aqui.");
    const content =
      section === "usuarios"
        ? `<section class="partner-panel"><header><h2>Contas da plataforma</h2><span>${data.users.length} usuários</span></header>${userRows(data)}</section>`
        : section === "lojas"
          ? `<section class="partner-panel"><header><h2>Gerenciar estabelecimentos</h2><a href="#/cadastro-parceiro">+ Novo parceiro</a></header>${storeRows(data)}</section>`
          : section === "entregadores"
            ? `<section class="partner-panel"><header><h2>Cadastros para análise</h2><span>${data.courierApplications.filter((item) => item.status === "pending").length} pendentes</span></header>${courierApplicationRows(data)}</section><section class="partner-panel"><header><h2>Entregadores ativos</h2><button class="btn btn-primary btn-sm" data-new-courier>Habilitar conta manualmente</button></header>${courierRows(data)}</section>`
            : section === "pedidos"
              ? `<section class="partner-panel"><header><h2>Todos os pedidos</h2><span>${data.orders.length} registros recentes</span></header>${orderRows(data)}</section>`
              : section === "entregas"
                ? `<section class="partner-panel"><header><h2>Operação de entregas</h2><span>${data.deliveries.length} registros</span></header>${deliveryRows(data)}</section>`
                : section === "pagamentos"
                  ? `<section class="partner-metrics"><article class="partner-metric"><i>✅</i><span>Pagamentos aprovados</span><b>${money(data.metrics.paidPayments)}</b><small>valor confirmado pelo provedor</small></article><article class="partner-metric"><i>⏳</i><span>Pendências</span><b>${data.metrics.pendingPayments}</b><small>pagamentos ou estornos aguardando</small></article></section><section class="partner-panel"><header><h2>Saques de entregadores</h2><span>${data.courierPayouts.length} solicitações</span></header>${payoutRows(data)}</section><section class="partner-panel"><header><h2>Pagamentos de pedidos</h2><span>${data.payments.length} registros</span></header>${paymentRows(data)}</section>`
                  : section === "suporte"
                    ? `<section class="partner-metrics"><article class="partner-metric"><i>💬</i><span>Chamados abertos</span><b>${data.metrics.openTickets}</b><small>aguardando atendimento</small></article></section><section class="partner-panel"><header><h2>Central de atendimento</h2><span>${data.tickets.length} chamados</span></header>${supportRows(data)}</section>`
                    : section === "auditoria"
                      ? `<section class="partner-panel"><header><h2>Auditoria recente</h2></header>${audit}</section>`
                      : section === "sistema"
                        ? `<section class="admin-system-grid"><article class="partner-panel"><header><h2>Infraestrutura</h2></header><div class="admin-check"><b>Banco persistente</b><em>${data.system.persistentStorage ? "✓ Ativo" : "⚠ Verificar"}</em></div><div class="admin-check"><b>Mercado Pago</b><em>${data.system.mercadoPagoConfigured ? "✓ Configurado" : "⚠ Sem credenciais"}</em></div><div class="admin-check"><b>Envio de e-mail</b><em>${data.system.mailConfigured ? "✓ Configurado" : "⚠ Sem credenciais"}</em></div><div class="admin-check"><b>Duração da sessão</b><em>${data.system.sessionHours} hora(s)</em></div></article><article class="partner-panel"><header><h2>Segurança operacional</h2></header><p class="admin-system-copy">Alterações de contas, estabelecimentos, entregadores, pagamentos e suporte ficam registradas na auditoria. Credenciais e segredos devem ser gerenciados nas variáveis protegidas do Railway.</p><a class="btn btn-outline" href="#/admin?secao=auditoria">Abrir auditoria</a></article></section>`
                        : `${metrics}<section class="admin-action-strip"><div><b>Central de operações</b><span>Gerencie rapidamente o que precisa da sua atenção.</span></div><a href="#/admin?secao=lojas"><strong>${data.metrics.pendingStores}</strong>Lojas pendentes</a><a href="#/admin?secao=entregadores"><strong>${data.metrics.pendingCourierApplications}</strong>Entregadores em análise</a><a href="#/admin?secao=suporte"><strong>${data.metrics.openTickets}</strong>Chamados abertos</a></section><div class="admin-overview-grid"><section class="partner-panel"><header><div><small>REDE FOODCOURT</small><h2>Estabelecimentos</h2></div><a href="#/admin?secao=lojas">Gerenciar todos →</a></header>${storeRows({ ...data, stores: data.stores.slice(0, 5) })}</section><section class="partner-panel"><header><div><small>ATIVIDADE</small><h2>Auditoria recente</h2></div><a href="#/admin?secao=auditoria">Ver histórico →</a></header>${audit}</section></div>`;
    const navIcons = {
      visao: "overview",
      usuarios: "users",
      lojas: "stores",
      entregadores: "courier",
      pedidos: "orders",
      entregas: "delivery",
      pagamentos: "payments",
      suporte: "support",
      auditoria: "audit",
      sistema: "settings",
    };
    view.innerHTML = `<div class="admin-shell"><aside class="admin-sidebar"><a class="admin-brand" href="#/admin"><span>FC</span><b>FoodCourt<small>Administração geral</small></b></a><nav aria-label="Seções administrativas">${tabs.map(([id, label]) => `<a class="${section === id ? "active" : ""}" href="#/admin?secao=${id}"><i>${adminIcon(navIcons[id])}</i><span>${label}</span>${id === "entregadores" && data.metrics.pendingCourierApplications ? `<b>${data.metrics.pendingCourierApplications}</b>` : ""}</a>`).join("")}</nav><a class="admin-account-link" href="#/perfil">← Voltar ao FoodCourt</a></aside><main class="admin-page"><header class="admin-head"><div><span>ADMINISTRAÇÃO GERAL</span><h1>${tabs.find(([id]) => id === section)?.[1]}</h1><p>Controle centralizado de toda a operação FoodCourt.</p></div><span class="admin-live"><i></i>Sistema online</span></header>${content}</main></div>`;
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
    view.querySelectorAll("[data-user-status]").forEach((button) =>
      button.addEventListener("click", async () => {
        const status = button.dataset.nextStatus;
        if (
          status === "suspended" &&
          !confirm("Suspender esta conta e encerrar suas sessões ativas?")
        )
          return;
        button.disabled = true;
        try {
          await api.updateAdminUserStatus(button.dataset.userStatus, status);
          toast(
            status === "active" ? "Conta reativada." : "Conta suspensa.",
            "success",
          );
          location.hash = `#/admin?secao=usuarios&at=${Date.now()}`;
        } catch (error) {
          toast(error.message, "error");
          button.disabled = false;
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
    view.querySelectorAll("[data-courier-application]").forEach((button) =>
      button.addEventListener("click", async () => {
        const action = button.dataset.applicationAction;
        const note =
          action === "reject" ? prompt("Explique o motivo da recusa:") : "";
        if (action === "reject" && !note) return;
        button.disabled = true;
        try {
          await api.updateAdminCourierApplication(
            button.dataset.courierApplication,
            action,
            note,
          );
          toast(
            action === "approve"
              ? "Entregador aprovado."
              : "Cadastro recusado.",
            "success",
          );
          location.hash = `#/admin?secao=entregadores&at=${Date.now()}`;
        } catch (error) {
          toast(error.message, "error");
          button.disabled = false;
        }
      }),
    );
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
    view.querySelectorAll("[data-support-reply]").forEach((button) =>
      button.addEventListener("click", async () => {
        const message = prompt("Resposta para este atendimento:");
        if (!message) return;
        button.disabled = true;
        try {
          await api.updateAdminSupport({
            ticketId: button.dataset.supportReply,
            action: "reply",
            message,
          });
          toast("Resposta enviada.", "success");
          location.hash = `#/admin?secao=suporte&at=${Date.now()}`;
        } catch (error) {
          toast(error.message, "error");
          button.disabled = false;
        }
      }),
    );
    view.querySelectorAll("[data-payout]").forEach((button) =>
      button.addEventListener("click", async () => {
        const verb =
          button.dataset.payoutStatus === "paid"
            ? "confirmar o pagamento"
            : "recusar o saque";
        if (!confirm(`Deseja ${verb}?`)) return;
        button.disabled = true;
        try {
          await api.updateAdminCourierPayout(
            button.dataset.payout,
            button.dataset.payoutStatus,
          );
          toast("Solicitação de saque atualizada.", "success");
          location.hash = `#/admin?secao=pagamentos&at=${Date.now()}`;
        } catch (error) {
          toast(error.message, "error");
          button.disabled = false;
        }
      }),
    );
    view.querySelectorAll("[data-support-action]").forEach((button) =>
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          await api.updateAdminSupport({
            ticketId: button.dataset.ticketId,
            action: button.dataset.supportAction,
          });
          toast("Atendimento atualizado.", "success");
          location.hash = `#/admin?secao=suporte&at=${Date.now()}`;
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

export function cleanup() {
  document.body.classList.remove("admin-mode");
}

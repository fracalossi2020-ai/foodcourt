import { api } from "../core/api.js";
import { esc, money, toast } from "../core/ui.js";
import { icon } from "../core/icons.js";

const nav = [
  ["dashboard", "Visão geral", "dashboard"],
  ["pedidos", "Pedidos", "orders"],
  ["cardapio", "Cardápio", "menu"],
  ["promocoes", "Promoções", "percent"],
  ["financeiro", "Financeiro", "wallet"],
  ["avaliacoes", "Avaliações", "star"],
  ["minhaloja", "Minha loja", "shop"],
  ["horarios", "Horários", "calendar"],
  ["plano", "Plano", "diamond"],
  ["configuracoes", "Configurações", "settings"],
  ["equipe", "Equipe", "users"],
  ["suporte", "Suporte", "help"],
];
const statusLabel = {
  pending: "Novo",
  accepted: "Aceito",
  preparing: "Preparando",
  ready: "Pronto",
  delivered: "Entregue",
  cancelled: "Cancelado",
};
let subscriptionPixTimer = null;

export async function render(
  view,
  boot,
  _params = {},
  query = new URLSearchParams(),
) {
  const section = nav.some(([id]) => id === query.get("secao"))
    ? query.get("secao")
    : "dashboard";
  view.innerHTML = `<div class="partner-loading">Carregando central do parceiro...</div>`;
  try {
    const payload = await load(section);
    view.innerHTML = `<div class="partner-shell"><aside class="partner-sidebar"><a class="partner-brand" href="#/parceiro"><i>FC</i><span>Central do<br><b>Parceiro</b></span></a><p class="partner-nav-label">GERENCIAR</p><nav>${nav.map(([id, label, iconName], index) => `<a class="${section === id ? "active" : ""}" style="--nav-index:${index}" href="#/parceiro?secao=${id}" title="Abrir ${label}"><span>${icon(iconName)}</span><b>${label}</b>${section === id ? "<i>Você está aqui</i>" : ""}</a>`).join("")}</nav><div class="partner-user"><span>${boot.user.avatarEmoji}</span><div><b>${esc(boot.user.fullName)}</b><small>Proprietário da loja</small></div></div></aside><main class="partner-main"><div class="partner-mobile-context"><b>${nav.find((item) => item[0] === section)?.[1]}</b><span>Gerencie sua operação com dados reais.</span></div>${content(section, payload)}</main></div>`;
    bind(view, section, payload);
  } catch (error) {
    if (error.code === "SUBSCRIPTION_INACTIVE") {
      view.innerHTML = pendingSubscription(error);
      bindPendingSubscription(view);
    } else
      view.innerHTML = `<div class="state-box"><div class="state-emoji">🔒</div><h3>Acesso do parceiro</h3><p>${esc(error.message)}</p><a class="btn btn-primary" href="#/login">Entrar como parceiro</a></div>`;
  }
}

function pendingSubscription(error) {
  const subscription = error.payload?.subscription;
  return `<div class="partner-pending-access"><span>PORTAL DO PARCEIRO</span><h1>Seu cadastro foi recebido.</h1><p>A assinatura <b>${esc(subscription?.planName || "FoodCourt Parceiro")}</b> está pendente. Faça o pagamento para iniciar o processo de ativação.</p><article><div><small>PLANO</small><b>FoodCourt Parceiro</b></div><strong>R$ ${Number(
    subscription?.price || 119.9,
  )
    .toFixed(2)
    .replace(
      ".",
      ",",
    )}<small>/mês</small></strong><em>PENDENTE</em></article><button class="btn btn-primary partner-subscription-pay" data-generate-subscription-pix>Pagar R$ 119,90 com Pix</button><section class="partner-subscription-pix" data-subscription-pix hidden></section><h2>Etapas da sua loja</h2><ol><li class="done">Cadastro do responsável</li><li class="done">Estabelecimento vinculado com segurança</li><li>Pagamento e ativação da assinatura</li><li>Identidade, horários e cardápio</li><li>Revisão e publicação</li></ol><div><a class="btn btn-outline" href="#/suporte">Falar com suporte</a><a class="btn btn-outline" href="#/inicio">Voltar ao FoodCourt</a></div></div>`;
}

function bindPendingSubscription(view) {
  const button = view.querySelector("[data-generate-subscription-pix]"),
    target = view.querySelector("[data-subscription-pix]");
  if (!button || !target) return;
  const generate = async () => {
    button.disabled = true;
    button.textContent = "Gerando Pix...";
    try {
      const charge = await api.createPartnerSubscriptionPix();
      renderSubscriptionPix(target, charge, generate);
      button.hidden = true;
    } catch (error) {
      toast(error.message || "Não foi possível gerar o Pix.", "error");
      button.disabled = false;
      button.textContent = "Tentar gerar o Pix novamente";
    }
  };
  button.addEventListener("click", generate);
}

export function renderSubscriptionPix(target, charge, regenerate) {
  clearInterval(subscriptionPixTimer);
  target.hidden = false;
  target.classList.remove("expired");
  target.innerHTML = `<div class="subscription-pix-qr"><img src="${charge.qrCode}" alt="QR Code Pix da assinatura"><b>R$ ${Number(charge.amount).toFixed(2).replace(".", ",")}</b><small>Valor da assinatura</small></div><div class="subscription-pix-content"><span class="subscription-pix-test">PIX · AMBIENTE DE TESTE</span><h2>Pague pelo aplicativo do seu banco</h2><p>Escaneie o QR Code ou copie o código Pix abaixo. O valor já está incluído e não pode ser alterado.</p><div class="subscription-pix-timer"><div><b data-pix-countdown>07:00</b><small>para o código expirar</small></div><i><span data-pix-progress></span></i></div><label>Pix copia e cola</label><div class="subscription-pix-copy"><input value="${esc(charge.payload)}" readonly aria-label="Código Pix copia e cola"><button type="button" data-copy-subscription-pix>Copiar código</button></div><p class="subscription-pix-warning">Este código usa a chave Pix informada e pode gerar uma transferência real. No ambiente local, a aprovação não é confirmada automaticamente.</p><button class="btn btn-primary subscription-pix-renew" type="button" data-renew-subscription-pix hidden>Gerar novo código Pix</button></div>`;
  target
    .querySelector("[data-copy-subscription-pix]")
    .addEventListener("click", async (event) => {
      try {
        await navigator.clipboard.writeText(charge.payload);
        event.currentTarget.textContent = "Copiado!";
        toast("Código Pix copiado.", "success");
      } catch {
        const input = target.querySelector("input");
        input.select();
        document.execCommand("copy");
        event.currentTarget.textContent = "Copiado!";
      }
    });
  target
    .querySelector("[data-renew-subscription-pix]")
    .addEventListener("click", regenerate);
  const countdown = target.querySelector("[data-pix-countdown]"),
    progress = target.querySelector("[data-pix-progress]"),
    renew = target.querySelector("[data-renew-subscription-pix]"),
    expiresAt = Number(charge.expiresAt) || Date.now() + 420000;
  const tick = () => {
    const remaining = Math.max(0, expiresAt - Date.now()),
      seconds = Math.ceil(remaining / 1000),
      minutes = Math.floor(seconds / 60);
    countdown.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
    progress.style.width = `${Math.max(0, Math.min(100, (remaining / 420000) * 100))}%`;
    if (!remaining) {
      clearInterval(subscriptionPixTimer);
      countdown.textContent = "EXPIRADO";
      target.classList.add("expired");
      renew.hidden = false;
    }
  };
  tick();
  subscriptionPixTimer = setInterval(tick, 1000);
}

export function cleanup() {
  clearInterval(subscriptionPixTimer);
  document
    .querySelector("[data-camera-video]")
    ?.srcObject?.getTracks()
    .forEach((track) => track.stop());
}

function load(section) {
  return [
    "dashboard",
    "minhaloja",
    "horarios",
    "plano",
    "configuracoes",
  ].includes(section)
    ? api.partnerDashboard()
    : section === "pedidos"
      ? api.partnerOrders()
      : section === "cardapio"
        ? api.partnerCatalog()
        : section === "promocoes"
          ? api.partnerPromotions()
          : section === "financeiro"
            ? api.partnerFinance()
            : section === "equipe"
              ? api.partnerTeam()
              : section === "avaliacoes"
                ? api.partnerReviews()
                : api.partnerSupport();
}
function head(kicker, title, sub, action = "") {
  const reports = {
      "Visão geral": "geral",
      "Gestor de pedidos": "pedidos",
      Promoções: "promocoes",
    },
    report = reports[title],
    pdf = report
      ? `<a class="btn btn-outline partner-pdf-button" href="/api/partner-report/${report}" target="_blank" rel="noopener">${icon("wallet")} Exportar PDF</a>`
      : "";
  return `<header class="partner-head"><div><span>${kicker}</span><h1>${title}</h1><p>${sub}</p></div>${pdf || action ? `<div class="partner-head-actions">${pdf}${action}</div>` : ""}</header>`;
}
function metric(symbol, label, value, sub) {
  const modern = {
    "📦": "package",
    "🧾": "receipt",
    "💰": "money",
    "💵": "money",
    "📉": "percent",
    "✅": "check",
    "🎯": "dashboard",
    "⭐": "star",
    "📅": "calendar",
  }[symbol];
  return `<article class="partner-metric"><i>${modern ? icon(modern) : symbol}</i><span>${label}</span><b>${value}</b><small>${sub}</small></article>`;
}
function storeContent(data) {
  const days = [
    ["mon", "Segunda"],
    ["tue", "Terça"],
    ["wed", "Quarta"],
    ["thu", "Quinta"],
    ["fri", "Sexta"],
    ["sat", "Sábado"],
    ["sun", "Domingo"],
  ];
  return `${head("ESTABELECIMENTO", "Minha loja", "Informações públicas e funcionamento automático da sua operação.")}<div class="store-management-grid"><form class="partner-panel partner-store-form" data-store-form><header class="partner-form-intro"><span>${icon("shop")}</span><div><h2>Informações públicas</h2><p>Dados que seus clientes verão no FoodCourt.</p></div></header><label><span>Nome da loja *</span><input class="input" name="name" value="${esc(data.store.name)}" required></label><label><span>Categoria principal *</span><input class="input" name="category" value="${esc(data.store.category)}" required></label><label class="wide"><span>Descrição</span><textarea class="input" name="description" maxlength="500">${esc(data.store.description || "")}</textarea></label><label><span>Telefone comercial</span><input class="input" name="phone" value="${esc(data.store.phone || "")}"></label><label><span>Tempo médio de preparo</span><div class="partner-field-unit"><input class="input" name="preparationMinutes" type="number" min="5" max="180" value="${data.store.preparationMinutes || 30}"><b>minutos</b></div></label><label><span>Pedido mínimo</span><div class="partner-field-unit money"><b>R$</b><input class="input" name="minimumOrder" type="number" min="0" step=".01" value="${data.store.minimumOrder || 0}"></div></label><footer class="partner-form-actions"><p><i>✓</i> Informações visíveis após salvar.</p><button class="btn btn-primary">Salvar informações</button></footer></form><form class="partner-panel store-schedule-card" data-hours-form><header><div><span>AUTOMAÇÃO DA LOJA</span><h2>Abertura e fechamento</h2><p>O FoodCourt atualiza o status automaticamente no horário de Brasília.</p></div><label class="partner-toggle schedule-master"><input type="checkbox" name="autoSchedule" ${data.store.autoSchedule ? "checked" : ""}><i></i><span>${data.store.autoSchedule ? "Automático ativado" : "Automático desativado"}</span></label></header><div class="schedule-status ${data.store.open ? "open" : ""}"><i></i><div><b>Agora: loja ${data.store.open ? "aberta" : "fechada"}</b><small>${data.store.autoSchedule ? "Status controlado pela programação abaixo." : "Ative a automação para usar os horários."}</small></div></div><div class="schedule-days">${days
    .map(([id, label]) => {
      const time = data.store.hours?.[id] || ["", ""],
        enabled = Boolean(time[0] && time[1]);
      return `<div class="schedule-day"><label class="schedule-day-toggle"><input type="checkbox" name="${id}Enabled" ${enabled ? "checked" : ""}><span><b>${label}</b><small>${enabled ? "Aberto neste dia" : "Fechado"}</small></span></label><div><input type="time" name="${id}Start" value="${time[0] || "09:00"}" ${enabled ? "" : "disabled"}><em>até</em><input type="time" name="${id}End" value="${time[1] || "18:00"}" ${enabled ? "" : "disabled"}></div></div>`;
    })
    .join(
      "",
    )}</div><footer><p>Horários que passam da meia-noite também são aceitos, como 18:00 até 02:00.</p><button class="btn btn-primary">Salvar programação</button></footer></form><form class="partner-panel partner-store-form" data-delivery-form><header class="partner-form-intro"><span>🛵</span><div><h2>Entrega e frete</h2><p>Defina os valores exibidos e cobrados no checkout.</p></div></header><label><span>Taxa base de entrega</span><div class="partner-field-unit money"><b>R$</b><input class="input" name="deliveryFee" type="number" min="0" max="500" step=".01" value="${data.store.deliveryFee || 0}"></div></label><label><span>Frete grátis a partir de</span><div class="partner-field-unit money"><b>R$</b><input class="input" name="freeShippingMin" type="number" min="0" step=".01" value="${data.store.freeShippingMin || 0}"></div></label><footer class="partner-form-actions"><p><i>✓</i> Use zero para desativar a regra.</p><button class="btn btn-primary">Salvar frete</button></footer></form></div>`;
}
function dashboardCharts(analytics = {}) {
  const daily = analytics.daily || [],
    statuses = analytics.status || [],
    max = Math.max(1, ...daily.map((day) => day.revenue)),
    total = statuses.reduce((sum, item) => sum + item.count, 0);
  const names = {
    pending: "Novos",
    accepted: "Aceitos",
    preparing: "Em preparo",
    ready: "Prontos",
    delivered: "Entregues",
    cancelled: "Cancelados",
  };
  const colors = {
    pending: "#f4a51c",
    accepted: "#4c83d4",
    preparing: "#7867d8",
    ready: "#23a967",
    delivered: "#07883f",
    cancelled: "#d6534d",
  };
  let cursor = 0;
  const gradient = statuses
    .map((item) => {
      const start = cursor,
        end = cursor + (total ? (item.count / total) * 100 : 0);
      cursor = end;
      return `${colors[item.name] || "#94a39b"} ${start}% ${end}%`;
    })
    .join(",");
  return `<section class="partner-dashboard-charts"><article class="partner-panel partner-sales-chart"><header><div><span>DESEMPENHO</span><h2>Volume de pedidos · 7 dias</h2></div><a href="#/parceiro?secao=financeiro">Ver financeiro →</a></header><div class="partner-bars" role="img" aria-label="Gráfico do volume bruto de pedidos dos últimos sete dias">${daily.map((day) => `<div><span><i style="height:${Math.max(day.revenue ? 10 : 2, (day.revenue / max) * 100)}%"></i><b>${day.revenue ? money(day.revenue) : "R$ 0"}</b></span><small>${esc(day.label)}</small></div>`).join("")}</div></article><article class="partner-panel partner-status-chart"><header><div><span>OPERAÇÃO</span><h2>Status dos pedidos</h2></div><a href="#/parceiro?secao=pedidos">Detalhes →</a></header><div class="partner-donut-wrap"><div class="partner-donut" style="--chart:${gradient || "var(--surface-2) 0 100%"}"><span><b>${total}</b><small>pedidos</small></span></div><div class="partner-chart-legend">${statuses.map((item) => `<span><i style="background:${colors[item.name]}"></i>${names[item.name] || item.name}<b>${item.count}</b></span>`).join("") || "<p>Sem pedidos no período.</p>"}</div></div></article></section>`;
}

function dashboard(data) {
  const active = Number(data.metrics.pending) || 0,
    lowStock = data.lowStock || [],
    rating = Number(data.metrics.rating) || 0;
  const urgentStock = lowStock.filter((product) => product.stock <= 5).length;
  const attention = [];
  if (active)
    attention.push(
      `<a href="#/parceiro?secao=pedidos"><i>📦</i><div><b>${active} ${active === 1 ? "pedido precisa" : "pedidos precisam"} de atenção</b><small>Acompanhe o preparo e mantenha o cliente informado.</small></div><span>Ver pedidos →</span></a>`,
    );
  if (urgentStock)
    attention.push(
      `<a href="#/parceiro?secao=cardapio"><i>⚠️</i><div><b>${urgentStock} ${urgentStock === 1 ? "produto está" : "produtos estão"} no estoque crítico</b><small>Atualize a quantidade ou pause os itens indisponíveis.</small></div><span>Repor estoque →</span></a>`,
    );
  if (!data.store.open)
    attention.push(
      `<button type="button" data-open-store><i>⏸️</i><div><b>Sua loja está pausada</b><small>Os clientes não conseguem fazer novos pedidos agora.</small></div><span>Abrir loja →</span></button>`,
    );
  const ratingValue = rating ? rating.toFixed(1) : "—";
  const ordersEmpty = `<div class="partner-dashboard-empty"><i>🧾</i><b>Nenhum pedido por aqui ainda</b><p>Quando um novo pedido chegar, ele aparecerá automaticamente nesta lista.</p><a class="btn btn-outline btn-sm" href="#/parceiro?secao=cardapio">Revisar cardápio</a></div>`;
  const stockEmpty = `<div class="partner-dashboard-empty is-success"><i>✓</i><b>Estoque em dia</b><p>Nenhum produto precisa de reposição neste momento.</p><a class="btn btn-outline btn-sm" href="#/parceiro?secao=cardapio">Ver produtos</a></div>`;
  return `${head("PAINEL OPERACIONAL", `Olá! ${esc(data.store.name)} está ${data.store.open ? "aberto" : "fechado"}.`, "Acompanhe sua operação de hoje e aja nos pontos mais importantes.", `<button class="store-switch ${data.store.open ? "on" : ""}"><i></i>${data.store.open ? "Loja aberta" : "Loja pausada"}</button>`)}
    <nav class="partner-quick-actions" aria-label="Ações rápidas"><span>Ações rápidas</span><a href="#/parceiro?secao=pedidos"><i>📦</i>Gerenciar pedidos</a><a href="#/parceiro?secao=cardapio"><i>＋</i>Adicionar produto</a><a href="#/parceiro?secao=promocoes"><i>％</i>Criar promoção</a></nav>
    <section class="partner-metrics partner-dashboard-metrics">${metric("📦", "Pedidos ativos", active, active ? `${active === 1 ? "pedido exige" : "pedidos exigem"} acompanhamento` : "nenhum pedido aguardando")}${metric("🧾", "Pedidos hoje", data.metrics.todayOrders, "recebidos na operação de hoje")}${metric("💰", "Receita entregue", money(data.metrics.revenue), "somente pedidos concluídos")}${metric("🎯", "Ticket médio", money(data.metrics.averageTicket || 0), "média dos pedidos entregues")}${metric("⭐", "Avaliação", ratingValue, rating ? "média dos clientes" : "aguardando avaliações")}</section>
    <section class="partner-attention ${attention.length ? "" : "is-clear"}"><header><div><span>AGORA</span><h2>${attention.length ? "Precisa da sua atenção" : "Tudo certo por aqui"}</h2></div><em>${attention.length ? `${attention.length} ${attention.length === 1 ? "alerta" : "alertas"}` : "Operação em dia"}</em></header>${attention.join("") || "<p>Não há pedidos ou produtos críticos aguardando uma ação sua.</p>"}</section>${dashboardCharts(data.analytics)}
    <div class="partner-columns partner-dashboard-columns"><section class="partner-panel"><header><h2>Pedidos recentes</h2><a href="#/parceiro?secao=pedidos">Ver todos →</a></header>${data.recentOrders.length ? orderRows(data.recentOrders) : ordersEmpty}</section><section class="partner-panel"><header><h2>Estoque crítico</h2><a href="#/parceiro?secao=cardapio">Gerenciar →</a></header>${lowStock.length ? lowStock.map((p) => `<div class="stock-row"><span>🍔</span><div><b>${esc(p.name)}</b><small>${p.stock} unidades restantes</small></div><em class="${p.stock <= 5 ? "critical" : ""}">${p.stock <= 5 ? "Crítico" : "Atenção"}</em></div>`).join("") : stockEmpty}</section></div>`;
}

function content(section, data) {
  if (section === "minhaloja") return storeContent(data);
  if (section === "minhaloja")
    return `${head("ESTABELECIMENTO", "Minha loja", "Edite as informações que o consumidor poderá visualizar.")}<form class="partner-panel partner-store-form" data-store-form><header class="partner-form-intro"><span>🏪</span><div><h2>Informações públicas da loja</h2><p>Preencha com dados simples e claros. Eles aparecerão para seus clientes.</p></div><em>Campos com * são obrigatórios</em></header><label><span>Nome da loja *</span><small>Como sua loja será encontrada</small><input class="input" name="name" value="${esc(data.store.name)}" placeholder="Ex.: Burger Neon" required></label><label><span>Categoria principal *</span><small>O tipo de comida que você vende</small><input class="input" name="category" value="${esc(data.store.category)}" placeholder="Ex.: Hambúrguer" required></label><label class="wide"><span>Descrição</span><small>Conte em poucas palavras o que torna sua loja especial</small><textarea class="input" name="description" maxlength="500" placeholder="Ex.: Hambúrgueres artesanais, combos e porções.">${esc(data.store.description || "")}</textarea></label><label><span>Telefone comercial</span><small>Para contato sobre a operação</small><input class="input" name="phone" value="${esc(data.store.phone || "")}" placeholder="(00) 00000-0000"></label><label><span>Tempo médio de preparo</span><small>Quanto tempo o pedido leva para ficar pronto</small><div class="partner-field-unit"><input class="input" name="preparationMinutes" type="number" min="5" max="180" value="${data.store.preparationMinutes || 30}"><b>minutos</b></div></label><label><span>Pedido mínimo</span><small>Menor valor aceito pela loja</small><div class="partner-field-unit money"><b>R$</b><input class="input" name="minimumOrder" type="number" min="0" step=".01" value="${data.store.minimumOrder || 0}"></div></label><footer class="partner-form-actions"><p><i>✓</i> As alterações ficam visíveis após salvar.</p><button class="btn btn-primary">Salvar alterações</button></footer></form>`;
  if (section === "horarios")
    return `${head("OPERAÇÃO", "Horários de funcionamento", "Configure quando sua loja atende.")}<form class="partner-panel partner-hours" data-hours-form>${[
      ["mon", "Segunda"],
      ["tue", "Terça"],
      ["wed", "Quarta"],
      ["thu", "Quinta"],
      ["fri", "Sexta"],
      ["sat", "Sábado"],
      ["sun", "Domingo"],
    ]
      .map(([id, label]) => {
        const time = data.store.hours?.[id] || ["", ""];
        return `<label><b>${label}</b><input type="time" name="${id}Start" value="${time[0] || ""}"><span>até</span><input type="time" name="${id}End" value="${time[1] || ""}"></label>`;
      })
      .join(
        "",
      )}<button class="btn btn-primary">Salvar horários</button></form>`;
  if (section === "plano") {
    const owner =
      data.subscription?.provider === "OWNER_ACCESS" ||
      data.subscription?.complimentary;
    return `${head("ACESSO", "Plano e permissões", "Informações validadas pelo servidor.")}<article class="partner-panel subscription-card"><span>FOODCOURT PARCEIRO</span><h2>${owner ? "ACESSO PROPRIETÁRIO" : "Plano ativo"}</h2><b class="subscription-status status-active">ATIVO</b><p>${owner ? "Sua conta proprietária possui acesso completo ao portal, sem cobrança e sem expiração." : "Seu Portal do Parceiro está ativo."}</p><ul><li>Gestão completa da loja</li><li>Cardápio e estoque</li><li>Pedidos e promoções</li><li>Financeiro e avaliações</li><li>Equipe e suporte</li></ul><button class="btn btn-outline" data-plan-details>Ver permissões</button></article>`;
  }
  if (section === "configuracoes")
    return `${head("PREFERÊNCIAS", "Configurações", "Dados gerais e segurança da operação.")}<div class="partner-panel partner-settings"><article><div><b>Notificações de novos pedidos</b><small>Mostra alertas quando um pedido chegar.</small></div><label class="partner-toggle"><input type="checkbox" data-order-notifications ${data.store.orderNotifications !== false ? "checked" : ""}><i></i><span>${data.store.orderNotifications !== false ? "Ativadas" : "Desativadas"}</span></label></article><article><div><b>Segurança da conta</b><small>Sessão, autorização e vínculo da loja estão protegidos.</small></div><button data-security-details>Ver detalhes</button></article><article><div><b>Voltar ao marketplace</b><small>Acesse o FoodCourt como consumidor.</small></div><a href="#/inicio">Abrir FoodCourt →</a></article></div>`;
  if (section === "dashboard") return dashboard(data);
  if (section === "pedidos")
    return `${head("OPERAÇÃO", "Gestor de pedidos", "Atualize cada etapa para manter o cliente informado.")}<div class="partner-order-flow"><span><i>1</i>Novo</span><b>→</b><span><i>2</i>Aceito</span><b>→</b><span><i>3</i>Preparando</span><b>→</b><span><i>4</i>Pronto</span><b>→</b><span><i>5</i>Entregue</span></div><div class="partner-filters" role="group" aria-label="Filtrar pedidos"><button class="active" data-order-filter="all">Todos <b>${data.orders.length}</b></button><button data-order-filter="pending">Novos <b>${data.orders.filter((o) => o.status === "pending").length}</b></button><button data-order-filter="preparing">Em preparo <b>${data.orders.filter((o) => ["accepted", "preparing"].includes(o.status)).length}</b></button><button data-order-filter="ready">Prontos <b>${data.orders.filter((o) => o.status === "ready").length}</b></button></div><div class="partner-panel order-board">${orderRows(data.orders, true, data.couriers)}</div>`;
  if (section === "cardapio") return catalogContent(data);
  if (section === "promocoes")
    return `${head("CRESCIMENTO", "Promoções", "Crie ofertas com regras claras e acompanhe seus resultados.", `<button class="btn btn-primary" data-new-promotion>+ Criar promoção</button>`)}<section class="promotion-summary"><div><span>Campanhas</span><b>${data.promotions.length}</b></div><div><span>Ativas agora</span><b>${data.promotions.filter((p) => p.active && (!p.endsAt || Date.parse(p.endsAt) >= Date.now())).length}</b></div><div><span>Utilizações</span><b>${data.promotions.reduce((sum, p) => sum + (p.uses || 0), 0)}</b></div></section><div class="promotion-grid">${data.promotions.map((p) => promotionCard(p)).join("") || emptyState(icon("percent"), "Nenhuma promoção criada", "Crie uma oferta com período, valor mínimo e código opcional.")}</div>`;
  if (section === "financeiro")
    return `${head("FINANCEIRO", "Recebimentos e repasses", "Valores calculados sobre pedidos entregues.")}<section class="partner-metrics">${metric("💵", "Vendas brutas", money(data.gross), `${data.orders} pedidos concluídos`)}${metric("📉", "Comissão", money(data.commission), "desconto da plataforma")}${metric("✅", "Você recebe", money(data.net), "valor líquido estimado")}${metric("📅", "Próximo repasse", new Date(data.nextPayout).toLocaleDateString("pt-BR"), "data prevista")}</section><div class="partner-panel partner-finance-explain"><h2>Como chegamos ao valor líquido?</h2><div><span>Vendas brutas <b>${money(data.gross)}</b></span><i>−</i><span>Comissão <b>${money(data.commission)}</b></span><i>=</i><span class="total">Você recebe <b>${money(data.net)}</b></span></div><button class="btn btn-outline" data-export-finance>Exportar relatório CSV</button></div>`;
  if (section === "avaliacoes")
    return `${head("REPUTAÇÃO", "Avaliações dos clientes", "Responda comentários e acompanhe a percepção da loja.")}<div class="partner-panel">${data.reviews.map((r) => `<article class="review-row"><span>${r.customerName.slice(0, 2).toUpperCase()}</span><div><b>${esc(r.customerName)}</b><strong aria-label="${r.rating} de 5 estrelas">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</strong><p>${esc(r.comment)}</p>${r.reply ? `<blockquote><b>Sua resposta</b>${esc(r.reply)}</blockquote>` : ""}<button data-review-reply="${r.id}">${r.reply ? "Editar resposta" : "Responder avaliação"}</button></div></article>`).join("") || emptyState("★", "Ainda não há avaliações", "As avaliações aparecerão depois dos pedidos entregues.")}</div>`;
  if (section === "equipe")
    return `${head("ACESSOS", "Equipe da loja", "Controle funções e permissões dos colaboradores.", `<button class="btn btn-primary" data-new-member>+ Convidar pessoa</button>`)}<div class="partner-role-legend"><span><b>Gerente</b> pode administrar a loja</span><span><b>Cozinha</b> acompanha e prepara pedidos</span></div><div class="partner-panel">${data.members.map((m) => `<div class="team-row"><span>${m.name.slice(0, 2).toUpperCase()}</span><div><b>${esc(m.name)}</b><small>${esc(m.email)}</small></div><em>${roleLabel(m.role)}</em><button aria-label="Editar ${esc(m.name)}" data-edit-member="${m.id}">Editar</button></div>`).join("") || emptyState("♟", "Nenhuma pessoa na equipe", "Convide alguém para ajudar na operação.")}</div>`;
  return `${head("ATENDIMENTO", "Suporte", "Converse sobre dúvidas e ocorrências da operação.")}<div class="partner-support-banner"><span>💬</span><div><b>Precisa de ajuda agora?</b><p>Descreva o problema com detalhes para receber uma orientação mais rápida.</p></div><button class="btn btn-primary" data-new-ticket>Novo chamado</button></div><div class="partner-panel">${data.tickets.map((t) => `<article class="ticket-row"><span>#${t.id.split("_").pop()}</span><div><b>${esc(t.subject)}</b><small>Última mensagem: ${esc(t.messages.at(-1)?.text || "")}</small></div><em>${t.status === "open" ? "Aberto" : "Resolvido"}</em><button class="btn btn-outline btn-sm" data-open-ticket="${t.id}">Abrir conversa</button></article>`).join("") || emptyState("✓", "Nenhum chamado aberto", "Quando precisar, abra uma conversa com o suporte.")}</div>`;
}

function catalogContent(data) {
  const suggested = data.profile.categories.flatMap((category) =>
    category.items.map((item) => ({
      ...item,
      category: category.name,
      stock: 0,
    })),
  );
  const previewProducts = data.products.length ? data.products : suggested;
  const grouped = previewProducts.reduce(
    (all, item) => (
      (all[item.category] = all[item.category] || []).push(item),
      all
    ),
    {},
  );
  const menuTheme = data.store.menuTheme || {
    background: "#f4f8f5",
    accent: "#07883f",
  };
  return `${head("CATÁLOGO", "Cardápio e estoque", "Monte, importe e publique seu cardápio em um só lugar.", `<div class="partner-head-actions"><button class="btn btn-outline" data-import-menu>Importar foto</button><button class="btn btn-primary" data-new-product>+ Novo produto</button></div>`)}
  <form class="menu-theme-editor" data-menu-theme-form style="--preview-bg:${menuTheme.background};--preview-accent:${menuTheme.accent}"><div><span>IDENTIDADE AUTOMÁTICA</span><h2>Seu cardápio, suas cores</h2><p>O layout já está pronto e funciona em celular e computador. Escolha somente as duas cores da sua marca.</p></div><label><input type="color" name="background" value="${menuTheme.background}"><span><b>Cor de fundo</b><small>Base de todo o cardápio</small></span></label><label><input type="color" name="accent" value="${menuTheme.accent}"><span><b>Cor de destaque</b><small>Botões, preços e detalhes</small></span></label><div class="menu-theme-swatch"><i></i><b>${esc(data.store.name)}</b><small>Prévia instantânea</small></div><button class="btn btn-primary">Salvar cores</button><a class="btn btn-outline" href="#/restaurante/${data.store.id}">Ver cardápio publicado ↗</a></form>
  <section class="menu-smart-start"><div><span>PERFIL IDENTIFICADO PELO CADASTRO</span><h2>${esc(data.profile.label)}</h2><p>Usamos a categoria <b>${esc(data.profile.source)}</b> para preparar a estrutura inicial. Você pode ajustar tudo antes de publicar.</p><div class="menu-smart-actions"><button class="btn btn-primary" data-use-template ${data.products.length ? "hidden" : ""}>Criar rascunho sugerido</button><button class="btn btn-outline" data-import-menu>Enviar foto do cardápio</button></div></div><div class="menu-ai-seal"><b>Leitura inteligente</b><span>Foto → revisão → rascunho</span><small>Nada é publicado sem sua confirmação.</small></div></section>
  <div class="partner-legend"><span><i class="on"></i> Disponível: cliente pode pedir</span><span><i></i> Rascunho ou pausado: cliente não vê</span></div>
  <div class="menu-workspace"><section><div class="partner-product-grid">${data.products.map(productCard).join("") || emptyState(icon("menu"), "Seu cardápio está pronto para começar", "Use o modelo sugerido, envie uma foto ou crie o primeiro produto.")}</div></section><aside class="menu-phone-preview"><header><span>PRÉVIA DO CLIENTE</span><b>${esc(data.store.name)}</b><small>${esc(data.profile.label)}</small></header><div class="menu-preview-scroll">${Object.entries(
    grouped,
  )
    .map(
      ([category, items]) =>
        `<section><h3>${esc(category)}</h3>${items.map((item) => `<article><div><b>${esc(item.name)}</b><p>${esc(item.description || "Descrição a definir")}</p></div><strong>${item.price ? money(item.price) : "Preço a definir"}</strong></article>`).join("")}</section>`,
    )
    .join(
      "",
    )}</div><footer>${data.products.length ? "Prévia baseada no seu cardápio" : "Estrutura sugerida, ainda não publicada"}</footer></aside></div>
  <div class="partner-modal menu-import-modal" data-menu-import-modal hidden><section class="menu-import-card"><button type="button" class="partner-modal-x" data-close-import aria-label="Fechar">×</button><span>IMPORTAÇÃO INTELIGENTE</span><h2>Transforme uma foto em cardápio</h2><p>Fotografe o cardápio inteiro, com boa luz. A IA identifica nomes, categorias, descrições e preços; depois você revisa antes de salvar.</p><div class="menu-photo-actions"><input type="file" accept="image/jpeg,image/png,image/webp" data-menu-file hidden><button class="menu-camera-button" type="button" data-open-camera><b>📷 Tirar foto</b><small>Abrir a câmera</small></button><button class="menu-gallery-button" type="button" data-open-gallery><b>🖼️ Escolher da galeria</b><small>JPG, PNG ou WebP</small></button></div><div class="menu-camera-preview" data-camera-preview hidden><video data-camera-video autoplay playsinline muted></video><div><button class="btn btn-primary" type="button" data-capture-camera>📷 Capturar foto</button><button class="btn btn-outline" type="button" data-cancel-camera>Cancelar</button></div></div><div data-menu-analysis></div></section></div>
  <div class="partner-modal" data-product-modal hidden><form class="partner-product-form"><input type="hidden" name="id"><input type="hidden" name="image"><span>PRODUTO DO CARDÁPIO</span><h2 data-product-form-title>Novo produto</h2><p>Adicione a foto e os dados principais. O FoodCourt cuida do restante do visual.</p><label class="product-photo-picker"><input type="file" accept="image/jpeg,image/png,image/webp" data-product-image hidden><i data-product-image-preview>📷</i><span><b>Foto do produto</b><small>Toque para escolher uma imagem</small></span></label><label>Nome do produto<input class="input" name="name" placeholder="Ex.: Hambúrguer artesanal" required></label><label>Categoria<input class="input" name="category" placeholder="Ex.: Lanches" required></label><label class="wide">Descrição<textarea class="input" name="description" maxlength="500" placeholder="Ingredientes, tamanho e diferenciais"></textarea></label><label>Preço em reais<input class="input" name="price" type="number" min="0" step="0.01" placeholder="0,00" required></label><label>Quantidade em estoque<input class="input" name="stock" type="number" min="0" placeholder="0" required></label><div><button class="btn btn-ghost" type="button" data-close-modal>Cancelar</button><button class="btn btn-primary">Salvar produto</button></div></form></div>`;
}

function analysisReview(analysis) {
  return `<div class="menu-analysis-result"><div class="menu-analysis-head"><div><span>LEITURA CONCLUÍDA</span><h3>${analysis.products.length} produtos encontrados</h3></div><small>${esc(analysis.establishmentType || "Tipo não identificado")}</small></div>${analysis.warnings?.length ? `<p class="menu-analysis-warning">${analysis.warnings.map(esc).join(" ")}</p>` : ""}<p>Revise os campos. Todos serão salvos pausados, como rascunho.</p><div class="menu-review-list">${analysis.products.map((item) => `<label class="menu-review-row"><input type="checkbox" checked data-import-select><input class="input" data-import-name value="${esc(item.name)}" aria-label="Nome"><input class="input" data-import-category value="${esc(item.category)}" aria-label="Categoria"><input class="input" data-import-price type="number" min="0" step="0.01" value="${item.price ?? ""}" placeholder="Preço" aria-label="Preço"><input type="hidden" data-import-description value="${esc(item.description || "")}"></label>`).join("")}</div><button class="btn btn-primary" data-confirm-import>Salvar selecionados como rascunho</button></div>`;
}

function promotionCard(p) {
  const finished = p.endsAt && Date.parse(p.endsAt) < Date.now(),
    status = finished ? "ENCERRADA" : p.active ? "ATIVA" : "PAUSADA",
    benefit = p.type === "fixed" ? money(p.value) : `${p.value}% OFF`,
    period = p.endsAt
      ? `Até ${new Date(p.endsAt).toLocaleDateString("pt-BR")}`
      : "Sem data final";
  return `<article class="promotion-card ${p.active && !finished ? "active" : ""}"><header><span>${status}</span><small>${period}</small></header><div class="promotion-benefit"><i>${icon("percent")}</i><strong>${benefit}</strong></div><h3>${esc(p.name)}</h3><p>${p.minimumOrder ? `Em pedidos a partir de ${money(p.minimumOrder)}` : "Sem valor mínimo"}${p.code ? ` · Código <b>${esc(p.code)}</b>` : ""}</p><footer><span><b>${p.uses || 0}</b> utilizações</span><button class="btn btn-outline btn-sm" data-edit-promotion="${p.id}">Gerenciar</button></footer></article>`;
}

function imageToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file?.type.match(/^image\/(jpeg|png|webp)$/))
      return reject(new Error("Escolha uma foto JPG, PNG ou WebP."));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível abrir a foto."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () =>
        reject(new Error("A foto selecionada não pôde ser lida."));
      image.onload = () => {
        const scale = Math.min(1, 1600 / Math.max(image.width, image.height)),
          canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas
          .getContext("2d")
          .drawImage(image, 0, 0, canvas.width, canvas.height);
        let quality = 0.82,
          data = canvas.toDataURL("image/jpeg", quality);
        while (data.length > 800000 && quality > 0.45) {
          quality -= 0.08;
          data = canvas.toDataURL("image/jpeg", quality);
        }
        if (data.length > 870000)
          return reject(
            new Error(
              "A foto ficou muito grande. Recorte o cardápio e tente novamente.",
            ),
          );
        resolve(data);
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function emptyState(icon, title, text) {
  return `<div class="partner-empty-state"><i>${icon}</i><h3>${title}</h3><p>${text}</p></div>`;
}
function roleLabel(role) {
  return (
    { manager: "Gerente", kitchen: "Cozinha", owner: "Proprietário" }[role] ||
    role
  );
}
function openActionModal(
  view,
  {
    title,
    text = "",
    fields = "",
    submitLabel = "Salvar",
    onSubmit = null,
    secondary = null,
  },
) {
  const modal = document.createElement("div");
  modal.className = "partner-modal partner-action-modal";
  modal.innerHTML = `<form class="partner-action-form"><button type="button" class="partner-modal-x" aria-label="Fechar">×</button><span>PORTAL DO PARCEIRO</span><h2>${title}</h2>${text ? `<p>${text}</p>` : ""}<div class="partner-action-fields">${fields}</div><p class="partner-action-error" role="alert" hidden></p><div class="partner-action-buttons">${secondary || ""}<button class="btn btn-ghost" type="button" data-modal-cancel>Cancelar</button>${onSubmit ? `<button class="btn btn-primary" type="submit">${submitLabel}</button>` : ""}</div></form>`;
  view.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector(".partner-modal-x").onclick = close;
  modal.querySelector("[data-modal-cancel]").onclick = close;
  modal.addEventListener("click", (event) => {
    if (event.target === modal) close();
  });
  modal.querySelector("form").onsubmit = async (event) => {
    event.preventDefault();
    if (!onSubmit) return;
    const button = event.currentTarget.querySelector('[type="submit"]'),
      error = modal.querySelector(".partner-action-error");
    button.disabled = true;
    button.textContent = "Salvando...";
    error.hidden = true;
    try {
      await onSubmit(Object.fromEntries(new FormData(event.currentTarget)));
      close();
    } catch (exception) {
      error.textContent = exception.message || "Não foi possível concluir.";
      error.hidden = false;
      button.disabled = false;
      button.textContent = submitLabel;
    }
  };
  setTimeout(
    () => modal.querySelector("input,textarea,select,button")?.focus(),
    50,
  );
  return modal;
}

function downloadFinanceCsv(data) {
  const rows = [
      ["Resumo financeiro", "Valor"],
      ["Vendas brutas", data.gross],
      ["Comissão", data.commission],
      ["Valor líquido", data.net],
      ["Pedidos concluídos", data.orders],
      [
        "Próximo repasse",
        new Date(data.nextPayout).toLocaleDateString("pt-BR"),
      ],
    ],
    csv =
      "\uFEFF" +
      rows
        .map((row) =>
          row
            .map((value) => `"${String(value).replaceAll('"', '""')}"`)
            .join(";"),
        )
        .join("\n"),
    url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    ),
    link = document.createElement("a");
  link.href = url;
  link.download = `financeiro-foodcourt-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function orderRows(orders, actions = false, couriers = []) {
  return (
    orders
      .map(
        (o) =>
          `<article class="partner-order" data-order-status="${o.status}"><span class="order-time">${new Date(o.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span><div><b>${esc(o.id)}</b><small><strong>${esc(o.customerName)}</strong> pediu ${o.items.map((i) => `${i.quantity}× ${esc(i.name)}`).join(", ")}</small></div><em class="status-${o.status}">${statusLabel[o.status]}</em><strong>${money(o.total)}</strong>${actions ? orderAction(o, couriers) : ""}</article>`,
      )
      .join("") ||
    emptyState(
      "▣",
      "Nenhum pedido nesta lista",
      "Os novos pedidos aparecerão aqui automaticamente.",
    )
  );
}
function orderAction(o, couriers) {
  const next = {
    pending: "accepted",
    accepted: "preparing",
    preparing: "ready",
  }[o.status];
  const canInvite =
    o.status === "ready" &&
    ["awaiting_store_assignment", "declined"].includes(o.delivery?.status);
  const invite = canInvite
    ? `<button class="btn btn-primary btn-sm" data-invite-courier="${o.id}" ${couriers.length ? "" : "disabled"}>${couriers.length ? "Chamar entregador" : "Sem entregadores"}</button>`
    : o.delivery?.status === "offered"
      ? `<small>Convite enviado · ${o.delivery.commissionPercent}%</small>`
      : "";
  return `<div class="partner-order-actions">${next ? `<button class="btn btn-primary btn-sm" data-order="${o.id}" data-status="${next}">${next === "accepted" ? "Aceitar" : next === "preparing" ? "Preparar" : "Marcar pronto"}</button>` : ""}${invite}${o.status === "pending" ? `<button class="btn btn-ghost btn-sm" data-order="${o.id}" data-status="cancelled">Recusar</button>` : ""}<a class="btn btn-outline btn-sm" href="#/conversa/${o.id}">Conversar</a></div>`;
}
function productCard(p) {
  return `<article class="partner-product"><div class="partner-product-image" ${p.image ? `style="background-image:url('${esc(p.image)}')"` : ""}>${p.image ? "" : "🍔"}<span>${p.stock} un.</span></div><div><span>${esc(p.category)}</span><h3>${esc(p.name)}</h3><b>${money(p.promoPrice ?? p.price)}</b><label><input type="checkbox" data-product-active="${p.id}" ${p.active ? "checked" : ""}> Disponível</label></div><button data-edit-product="${p.id}">Editar</button></article>`;
}
function bind(view, section, data) {
  const themeForm = view.querySelector("[data-menu-theme-form]");
  if (themeForm) {
    const refreshThemePreview = () => {
      themeForm.style.setProperty(
        "--preview-bg",
        themeForm.elements.background.value,
      );
      themeForm.style.setProperty(
        "--preview-accent",
        themeForm.elements.accent.value,
      );
    };
    themeForm.addEventListener("input", refreshThemePreview);
    themeForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = themeForm.querySelector('button[type="submit"],button');
      button.disabled = true;
      try {
        await api.updatePartnerStore({
          menuTheme: {
            background: themeForm.elements.background.value,
            accent: themeForm.elements.accent.value,
          },
        });
        toast("Cores do cardápio publicadas.", "success");
      } catch (error) {
        toast(error.message, "error");
      } finally {
        button.disabled = false;
      }
    });
  }
  view
    .querySelector("[data-toggle-guide]")
    ?.addEventListener("click", (event) => {
      const guide = event.currentTarget.closest("[data-guide]"),
        collapsed = guide.classList.toggle("collapsed");
      event.currentTarget.textContent = collapsed
        ? "Mostrar ajuda"
        : "Ocultar ajuda";
      event.currentTarget.setAttribute("aria-expanded", String(!collapsed));
    });
  const financeCsvButton = view.querySelector("[data-export-finance]");
  if (financeCsvButton) {
    const actions = document.createElement("div");
    actions.className = "finance-export-actions";
    financeCsvButton.before(actions);
    actions.append(financeCsvButton);
    actions.insertAdjacentHTML(
      "beforeend",
      `<a class="btn btn-outline partner-pdf-button" href="/api/partner-report/financeiro" target="_blank" rel="noopener">${icon("wallet")} Exportar PDF</a>`,
    );
  }
  financeCsvButton?.addEventListener("click", () => {
    downloadFinanceCsv(data);
    toast("Relatório financeiro baixado.", "success");
  });
  view
    .querySelector("[data-order-notifications]")
    ?.addEventListener("change", async (event) => {
      const input = event.currentTarget,
        label = input.closest("label").querySelector("span");
      input.disabled = true;
      try {
        await api.updatePartnerStore({ orderNotifications: input.checked });
        label.textContent = input.checked ? "Ativadas" : "Desativadas";
        toast("Preferência de notificações salva.", "success");
      } catch (error) {
        input.checked = !input.checked;
        toast(error.message, "error");
      } finally {
        input.disabled = false;
      }
    });
  view.querySelector("[data-plan-details]")?.addEventListener("click", () =>
    openActionModal(view, {
      title: "Permissões do proprietário",
      text: "Sua conta possui acesso total às ferramentas do Portal do Parceiro.",
      fields:
        '<div class="partner-modal-info"><b>Status da conta</b><span>Portal ativo e loja vinculada</span><b>Acesso disponível</b><span>Pedidos, cardápio, promoções, financeiro, equipe, configurações e suporte</span></div>',
    }),
  );
  view.querySelector("[data-security-details]")?.addEventListener("click", () =>
    openActionModal(view, {
      title: "Segurança da conta",
      text: "Somente pessoas autenticadas e vinculadas à sua loja conseguem acessar estes dados.",
      fields:
        '<div class="partner-modal-info"><b>✓ Sessão protegida</b><span>Seu acesso usa um cookie seguro.</span><b>✓ Dados separados</b><span>Cada parceiro visualiza apenas a própria loja.</span></div>',
    }),
  );
  const promotionModal = (promotion) => {
    const start = promotion?.startsAt
        ? new Date(promotion.startsAt).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      end = promotion?.endsAt
        ? new Date(promotion.endsAt).toISOString().slice(0, 10)
        : "";
    const modal = openActionModal(view, {
      title: promotion ? "Gerenciar promoção" : "Criar nova promoção",
      text: "Configure a oferta e confira a prévia antes de disponibilizar aos clientes.",
      fields: `<div class="promotion-editor"><div class="promotion-editor-fields"><input type="hidden" name="id" value="${esc(promotion?.id || "")}"><label><span>Nome da campanha</span><small>Uso interno e identificação da oferta</small><input class="input" name="name" maxlength="80" value="${esc(promotion?.name || "")}" placeholder="Ex.: Almoço com desconto" required></label><div class="promotion-form-grid"><label><span>Tipo de desconto</span><select class="input" name="type" data-promo-type><option value="percent" ${promotion?.type !== "fixed" ? "selected" : ""}>Porcentagem (%)</option><option value="fixed" ${promotion?.type === "fixed" ? "selected" : ""}>Valor em reais (R$)</option></select></label><label><span>Valor do desconto</span><div class="promo-value-field"><b data-promo-unit>${promotion?.type === "fixed" ? "R$" : "%"}</b><input class="input" name="value" type="number" min="1" ${promotion?.type === "fixed" ? 'step="0.01"' : 'max="90"'} value="${promotion?.value || 10}" required></div></label></div><div class="promotion-form-grid"><label><span>Pedido mínimo</span><small>Use zero para não exigir mínimo</small><input class="input" name="minimumOrder" type="number" min="0" step="0.01" value="${promotion?.minimumOrder || 0}"></label><label><span>Código promocional</span><small>Opcional, somente letras e números</small><input class="input" name="code" maxlength="20" value="${esc(promotion?.code || "")}" placeholder="EX.: ALMOCO10"></label></div><div class="promotion-form-grid"><label><span>Começa em</span><input class="input" name="startsAt" type="date" value="${start}" required></label><label><span>Termina em</span><input class="input" name="endsAt" type="date" value="${end}"></label></div><label class="promotion-status-toggle"><input name="active" type="checkbox" ${promotion?.active !== false ? "checked" : ""}><i></i><span><b>Campanha ativa</b><small>Pode ser pausada a qualquer momento</small></span></label></div><aside class="promotion-live-preview"><span>PRÉVIA PARA O CLIENTE</span><div><small>OFERTA FOODCOURT</small><strong data-promo-preview-value>${promotion?.type === "fixed" ? money(promotion?.value || 10) : `${promotion?.value || 10}% OFF`}</strong><h3 data-promo-preview-name>${esc(promotion?.name || "Sua promoção")}</h3><p data-promo-preview-rule>${promotion?.minimumOrder ? `Em pedidos a partir de ${money(promotion.minimumOrder)}` : "Válida para qualquer pedido"}</p><b data-promo-preview-code>${promotion?.code ? `Use ${esc(promotion.code)}` : "Aplicada automaticamente"}</b></div><small>Você pode revisar e alterar depois.</small></aside></div>`,
      submitLabel: promotion ? "Salvar promoção" : "Criar promoção",
      onSubmit: async (values) => {
        await api.savePartnerPromotion({
          ...values,
          active: values.active === "on",
        });
        toast(
          promotion ? "Promoção atualizada." : "Promoção criada.",
          "success",
        );
        location.hash = "#/parceiro?secao=promocoes&at=" + Date.now();
      },
    });
    modal.classList.add("promotion-modal");
    const form = modal.querySelector("form"),
      refresh = () => {
        const type = form.elements.type.value,
          value = Number(form.elements.value.value) || 0,
          min = Number(form.elements.minimumOrder.value) || 0,
          code = form.elements.code.value.trim().toUpperCase();
        modal.querySelector("[data-promo-unit]").textContent =
          type === "fixed" ? "R$" : "%";
        form.elements.value.max = type === "percent" ? "90" : "";
        modal.querySelector("[data-promo-preview-value]").textContent =
          type === "fixed" ? money(value) : `${value}% OFF`;
        modal.querySelector("[data-promo-preview-name]").textContent =
          form.elements.name.value || "Sua promoção";
        modal.querySelector("[data-promo-preview-rule]").textContent = min
          ? `Em pedidos a partir de ${money(min)}`
          : "Válida para qualquer pedido";
        modal.querySelector("[data-promo-preview-code]").textContent = code
          ? `Use ${code}`
          : "Aplicada automaticamente";
      };
    form.addEventListener("input", refresh);
    form.addEventListener("change", refresh);
    return modal;
  };
  view
    .querySelector("[data-new-promotion]")
    ?.addEventListener("click", () => promotionModal());
  view
    .querySelectorAll("[data-edit-promotion]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        promotionModal(
          data.promotions.find(
            (item) => item.id === button.dataset.editPromotion,
          ),
        ),
      ),
    );
  view.querySelectorAll("[data-review-reply]").forEach((button) =>
    button.addEventListener("click", () => {
      const review = data.reviews.find(
        (item) => item.id === button.dataset.reviewReply,
      );
      openActionModal(view, {
        title: "Responder avaliação",
        text: `Sua resposta ficará vinculada ao comentário de ${esc(review.customerName)}.`,
        fields: `<label>Sua resposta<textarea class="input" name="reply" rows="5" maxlength="500" placeholder="Agradeça e responda com educação" required>${esc(review.reply || "")}</textarea></label>`,
        submitLabel: "Publicar resposta",
        onSubmit: async (values) => {
          await api.replyPartnerReview(review.id, values.reply);
          toast("Resposta publicada.", "success");
          location.hash = "#/parceiro?secao=avaliacoes&at=" + Date.now();
        },
      });
    }),
  );
  const memberModal = (member) => {
    const modal = openActionModal(view, {
      title: member ? "Editar acesso" : "Convidar pessoa",
      text: "Escolha o que esta pessoa poderá fazer na operação.",
      fields: `<input type="hidden" name="id" value="${esc(member?.id || "")}"><label>Nome completo<input class="input" name="name" value="${esc(member?.name || "")}" required></label><label>E-mail<input class="input" name="email" type="email" value="${esc(member?.email || "")}" required></label><label>Função<select class="input" name="role"><option value="kitchen" ${member?.role === "kitchen" ? "selected" : ""}>Cozinha — acompanha pedidos</option><option value="manager" ${member?.role === "manager" ? "selected" : ""}>Gerente — administra a loja</option></select></label>`,
      submitLabel: member ? "Salvar acesso" : "Enviar convite",
      secondary: member
        ? '<button class="btn btn-danger" type="button" data-remove-member>Remover</button>'
        : "",
      onSubmit: async (values) => {
        await api.savePartnerTeamMember(values);
        toast(
          member ? "Acesso atualizado." : "Pessoa adicionada à equipe.",
          "success",
        );
        location.hash = "#/parceiro?secao=equipe&at=" + Date.now();
      },
    });
    modal
      .querySelector("[data-remove-member]")
      ?.addEventListener("click", async () => {
        if (!confirm(`Remover ${member.name} da equipe?`)) return;
        await api.savePartnerTeamMember({ id: member.id, action: "remove" });
        modal.remove();
        toast("Pessoa removida da equipe.", "success");
        location.hash = "#/parceiro?secao=equipe&at=" + Date.now();
      });
  };
  view
    .querySelector("[data-new-member]")
    ?.addEventListener("click", () => memberModal());
  view
    .querySelectorAll("[data-edit-member]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        memberModal(
          data.members.find((item) => item.id === button.dataset.editMember),
        ),
      ),
    );
  const ticketModal = (ticket) =>
    openActionModal(view, {
      title: ticket ? ticket.subject : "Novo chamado",
      text: ticket
        ? `Última mensagem: ${esc(ticket.messages.at(-1)?.text || "")}`
        : "Conte o que aconteceu. Quanto mais detalhes, mais rápido será o atendimento.",
      fields: ticket
        ? `<input type="hidden" name="id" value="${ticket.id}"><label>Nova mensagem<textarea class="input" name="message" rows="5" required></textarea></label>`
        : '<label>Assunto<input class="input" name="subject" placeholder="Ex.: Dúvida sobre pedido" required></label><label>Descreva o problema<textarea class="input" name="message" rows="5" required></textarea></label>',
      submitLabel: ticket ? "Enviar mensagem" : "Abrir chamado",
      onSubmit: async (values) => {
        await api.savePartnerSupport(values);
        toast(ticket ? "Mensagem enviada." : "Chamado aberto.", "success");
        location.hash = "#/parceiro?secao=suporte&at=" + Date.now();
      },
    });
  view
    .querySelector("[data-new-ticket]")
    ?.addEventListener("click", () => ticketModal());
  view
    .querySelectorAll("[data-open-ticket]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        ticketModal(
          data.tickets.find((item) => item.id === button.dataset.openTicket),
        ),
      ),
    );
  view.querySelectorAll("[data-order-filter]").forEach((button) =>
    button.addEventListener("click", () => {
      view
        .querySelectorAll("[data-order-filter]")
        .forEach((item) => item.classList.toggle("active", item === button));
      const filter = button.dataset.orderFilter;
      view.querySelectorAll("[data-order-status]").forEach((row) => {
        const status = row.dataset.orderStatus;
        row.hidden =
          filter !== "all" &&
          (filter === "preparing"
            ? !["accepted", "preparing"].includes(status)
            : status !== filter);
      });
    }),
  );
  view
    .querySelector(".store-switch")
    ?.addEventListener("click", async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      try {
        const open = !button.classList.contains("on");
        await api.updatePartnerStore({ open });
        toast(open ? "Loja aberta." : "Loja pausada.", "success");
        location.hash = "#/parceiro?at=" + Date.now();
      } catch (e) {
        toast(e.message, "error");
        button.disabled = false;
      }
    });
  view
    .querySelector("[data-open-store]")
    ?.addEventListener("click", () =>
      view.querySelector(".store-switch")?.click(),
    );
  view
    .querySelector("[data-store-form]")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.currentTarget));
      try {
        await api.updatePartnerStore(values);
        toast("Informações da loja atualizadas.", "success");
      } catch (e) {
        toast(e.message, "error");
      }
    });
  view
    .querySelector("[data-delivery-form]")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.currentTarget));
      try {
        await api.updatePartnerStore(values);
        toast("Configuração de frete atualizada.", "success");
        location.hash = `#/parceiro?secao=minhaloja&at=${Date.now()}`;
      } catch (error) {
        toast(error.message, "error");
      }
    });
  view.querySelectorAll(".schedule-day-toggle input").forEach((input) =>
    input.addEventListener("change", () => {
      const row = input.closest(".schedule-day"),
        times = row.querySelectorAll('input[type="time"]'),
        label = row.querySelector("small");
      times.forEach((field) => (field.disabled = !input.checked));
      label.textContent = input.checked ? "Aberto neste dia" : "Fechado";
    }),
  );
  view
    .querySelector('[name="autoSchedule"]')
    ?.addEventListener("change", (event) => {
      event.currentTarget.closest("label").querySelector("span").textContent =
        event.currentTarget.checked
          ? "Automático ativado"
          : "Automático desativado";
    });
  view
    .querySelector("[data-hours-form]")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.currentTarget)),
        hours = {};
      for (const day of ["mon", "tue", "wed", "thu", "fri", "sat", "sun"])
        hours[day] =
          values[day + "Enabled"] === "on"
            ? [values[day + "Start"], values[day + "End"]]
            : ["", ""];
      const button = event.currentTarget.querySelector(
        'button[type="submit"],button:not([type])',
      );
      button.disabled = true;
      button.textContent = "Salvando...";
      try {
        await api.updatePartnerStore({
          hours,
          autoSchedule: values.autoSchedule === "on",
        });
        toast("Programação salva e status da loja atualizado.", "success");
        location.hash = "#/parceiro?secao=minhaloja&at=" + Date.now();
      } catch (e) {
        toast(e.message, "error");
        button.disabled = false;
        button.textContent = "Salvar programação";
      }
    });
  view.querySelectorAll("[data-invite-courier]").forEach((button) =>
    button.addEventListener("click", async () => {
      const options = data.couriers
        .map(
          (courier, index) =>
            `${index + 1}. ${courier.fullName} · ${courier.vehicle} · ⭐ ${courier.rating.toFixed(1)}`,
        )
        .join("\n");
      const choice = Number(prompt(`Escolha o entregador:\n${options}`));
      const courier = data.couriers[choice - 1];
      if (!courier) return;
      const percent = Number(
        String(
          prompt("Comissão sobre o total do pedido (%):", "15") || "",
        ).replace(",", "."),
      );
      if (!percent) return;
      button.disabled = true;
      try {
        await api.assignPartnerCourier(
          button.dataset.inviteCourier,
          courier.id,
          percent,
        );
        toast("Convite enviado ao entregador.", "success");
        location.hash = "#/parceiro?secao=pedidos&at=" + Date.now();
      } catch (error) {
        toast(error.message, "error");
        button.disabled = false;
      }
    }),
  );
  view.querySelectorAll("[data-order]").forEach((button) =>
    button.addEventListener("click", async () => {
      if (
        button.dataset.status === "cancelled" &&
        !confirm("Recusar este pedido? Esta ação será registrada.")
      )
        return;
      button.disabled = true;
      try {
        await api.updatePartnerOrder(
          button.dataset.order,
          button.dataset.status,
        );
        toast(
          button.dataset.status === "cancelled"
            ? "Pedido recusado."
            : "Status atualizado.",
          "success",
        );
        location.hash = "#/parceiro?secao=pedidos&at=" + Date.now();
      } catch (e) {
        toast(e.message, "error");
        button.disabled = false;
      }
    }),
  );
  view.querySelectorAll("[data-product-active]").forEach((input) =>
    input.addEventListener("change", async () => {
      const product = data.products.find(
        (item) => item.id === input.dataset.productActive,
      );
      if (!product) return;
      input.disabled = true;
      try {
        await api.savePartnerProduct({ ...product, active: input.checked });
        toast(
          input.checked ? "Produto disponível." : "Produto pausado.",
          "success",
        );
      } catch (e) {
        input.checked = !input.checked;
        toast(e.message, "error");
      } finally {
        input.disabled = false;
      }
    }),
  );
  view
    .querySelector("[data-use-template]")
    ?.addEventListener("click", async (event) => {
      const button = event.currentTarget,
        products = data.profile.categories.flatMap((category) =>
          category.items.map((item) => ({
            ...item,
            category: category.name,
            stock: 0,
          })),
        );
      button.disabled = true;
      button.textContent = "Criando rascunho...";
      try {
        const result = await api.importPartnerMenu(products);
        toast(
          `${result.count} produtos sugeridos foram criados como rascunho.`,
          "success",
        );
        location.hash = "#/parceiro?secao=cardapio&at=" + Date.now();
      } catch (error) {
        toast(error.message, "error");
        button.disabled = false;
        button.textContent = "Criar rascunho sugerido";
      }
    });
  const importModal = view.querySelector("[data-menu-import-modal]"),
    analysisBox = view.querySelector("[data-menu-analysis]");
  view.querySelectorAll("[data-import-menu]").forEach((button) =>
    button.addEventListener("click", () => {
      importModal.hidden = false;
    }),
  );
  view.querySelector("[data-close-import]")?.addEventListener("click", () => {
    stopCamera();
    importModal.hidden = true;
  });
  importModal?.addEventListener("click", (event) => {
    if (event.target === importModal) {
      stopCamera();
      importModal.hidden = true;
    }
  });
  const menuFileInput = view.querySelector("[data-menu-file]"),
    cameraPreview = view.querySelector("[data-camera-preview]"),
    cameraVideo = view.querySelector("[data-camera-video]");
  let cameraStream = null;
  const stopCamera = () => {
    cameraStream?.getTracks().forEach((track) => track.stop());
    cameraStream = null;
    if (cameraVideo) cameraVideo.srcObject = null;
    if (cameraPreview) cameraPreview.hidden = true;
  };
  view
    .querySelector("[data-open-camera]")
    ?.addEventListener("click", async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        menuFileInput.setAttribute("capture", "environment");
        menuFileInput.click();
        return;
      }
      try {
        stopCamera();
        cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        cameraVideo.srcObject = cameraStream;
        cameraPreview.hidden = false;
        await cameraVideo.play();
        cameraPreview.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch (error) {
        stopCamera();
        toast(
          error.name === "NotAllowedError"
            ? "Permita o acesso à câmera no navegador."
            : "Não foi possível abrir a câmera.",
          "error",
        );
      }
    });
  view.querySelector("[data-open-gallery]")?.addEventListener("click", () => {
    stopCamera();
    menuFileInput.removeAttribute("capture");
    menuFileInput.click();
  });
  view
    .querySelector("[data-cancel-camera]")
    ?.addEventListener("click", stopCamera);
  view.querySelector("[data-capture-camera]")?.addEventListener("click", () => {
    if (!cameraVideo.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = cameraVideo.videoWidth;
    canvas.height = cameraVideo.videoHeight;
    canvas.getContext("2d").drawImage(cameraVideo, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const transfer = new DataTransfer();
        transfer.items.add(
          new File([blob], `cardapio-${Date.now()}.jpg`, {
            type: "image/jpeg",
          }),
        );
        menuFileInput.files = transfer.files;
        stopCamera();
        menuFileInput.dispatchEvent(new Event("change", { bubbles: true }));
      },
      "image/jpeg",
      0.9,
    );
  });
  view
    .querySelector("[data-menu-file]")
    ?.addEventListener("change", async (event) => {
      const file = event.currentTarget.files?.[0];
      if (!file) return;
      analysisBox.innerHTML =
        '<div class="menu-ai-progress"><i></i><b>Analisando o cardápio...</b><span>Isso pode levar alguns minutos. Mantenha esta janela aberta.</span></div>';
      try {
        const image = await imageToDataUrl(file),
          result = await api.analyzePartnerMenu(image);
        analysisBox.innerHTML = analysisReview(result.analysis);
        analysisBox.querySelector("[data-confirm-import]").onclick = async (
          confirmEvent,
        ) => {
          const button = confirmEvent.currentTarget,
            products = [...analysisBox.querySelectorAll(".menu-review-row")]
              .filter(
                (row) => row.querySelector("[data-import-select]").checked,
              )
              .map((row) => ({
                name: row.querySelector("[data-import-name]").value,
                category: row.querySelector("[data-import-category]").value,
                price: row.querySelector("[data-import-price]").value,
                description: row.querySelector("[data-import-description]")
                  .value,
                stock: 0,
              }));
          button.disabled = true;
          button.textContent = "Salvando rascunhos...";
          try {
            const saved = await api.importPartnerMenu(products);
            toast(
              `${saved.count} produtos importados. Revise e ative quando estiver pronto.`,
              "success",
            );
            location.hash = "#/parceiro?secao=cardapio&at=" + Date.now();
          } catch (error) {
            toast(error.message, "error");
            button.disabled = false;
            button.textContent = "Salvar selecionados como rascunho";
          }
        };
      } catch (error) {
        analysisBox.innerHTML = `<div class="menu-ai-error"><b>Não foi possível concluir a leitura</b><p>${esc(error.message)}</p><small>Você ainda pode usar o modelo sugerido ou cadastrar produtos manualmente.</small></div>`;
      }
    });
  const modal = view.querySelector("[data-product-modal]"),
    productForm = view.querySelector(".partner-product-form");
  const openProduct = (product = null) => {
    if (!modal || !productForm) return;
    productForm.reset();
    productForm.elements.id.value = product?.id || "";
    productForm.elements.name.value = product?.name || "";
    productForm.elements.category.value = product?.category || "";
    productForm.elements.description.value = product?.description || "";
    productForm.elements.price.value = product?.price ?? "";
    productForm.elements.stock.value = product?.stock ?? "";
    productForm.elements.image.value = product?.image || "";
    const preview = productForm.querySelector("[data-product-image-preview]");
    preview.textContent = product?.image ? "" : "📷";
    preview.style.backgroundImage = product?.image
      ? `url('${product.image}')`
      : "none";
    productForm.querySelector("[data-product-form-title]").textContent = product
      ? "Editar produto"
      : "Novo produto";
    modal.hidden = false;
    setTimeout(() => productForm.elements.name.focus(), 50);
  };
  productForm
    ?.querySelector("[data-product-image]")
    ?.addEventListener("change", async (event) => {
      const file = event.currentTarget.files?.[0];
      if (!file) return;
      try {
        const image = await imageToDataUrl(file);
        productForm.elements.image.value = image;
        const preview = productForm.querySelector(
          "[data-product-image-preview]",
        );
        preview.textContent = "";
        preview.style.backgroundImage = `url('${image}')`;
      } catch (error) {
        toast(error.message, "error");
      }
    });
  view
    .querySelector("[data-new-product]")
    ?.addEventListener("click", () => openProduct());
  view
    .querySelectorAll("[data-edit-product]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        openProduct(
          data.products.find((item) => item.id === button.dataset.editProduct),
        ),
      ),
    );
  view
    .querySelector("[data-close-modal]")
    ?.addEventListener("click", () => (modal.hidden = true));
  modal?.addEventListener("click", (event) => {
    if (event.target === modal) modal.hidden = true;
  });
  productForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget),
      existing = data.products.find((item) => item.id === form.get("id"));
    const submit = event.currentTarget.querySelector(".btn-primary");
    submit.disabled = true;
    submit.textContent = "Salvando...";
    try {
      await api.savePartnerProduct({
        id: form.get("id") || undefined,
        name: form.get("name"),
        category: form.get("category"),
        description: form.get("description"),
        price: form.get("price"),
        stock: form.get("stock"),
        image: form.get("image"),
        active: existing?.active ?? true,
      });
      toast(existing ? "Produto atualizado." : "Produto criado.", "success");
      location.hash = "#/parceiro?secao=cardapio&at=" + Date.now();
    } catch (error) {
      toast(error.message || "Não foi possível salvar o produto.", "error");
      submit.disabled = false;
      submit.textContent = "Salvar produto";
    }
  });
}

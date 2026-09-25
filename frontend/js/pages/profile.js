import { store } from "../core/store.js";
import { mountPush } from '../core/push-settings.js';
import { api } from "../core/api.js";
import { esc, toast } from "../core/ui.js";
import { icon } from "../core/icons.js";

const sections = {
  conta: {
    icon: "user",
    title: "Minha conta",
    subtitle: "Nome, e-mail e telefone",
  },
  enderecos: {
    icon: "pin",
    title: "Endereços",
    subtitle: "Escolha onde deseja receber seus pedidos",
  },
  pagamentos: {
    icon: "wallet",
    title: "Pagamentos",
    subtitle: "Defina sua forma de pagamento preferida",
  },
  beneficios: {
    icon: "star",
    title: "Programa de benefícios",
    subtitle: "Acompanhe seus pontos e vantagens",
  },
  seguranca: {
    icon: "shield",
    title: "Segurança",
    subtitle: "Senha e acesso à conta",
  },
  privacidade: {
    icon: "lock",
    title: "Privacidade",
    subtitle: "Seus dados, exportação e exclusão da conta",
  },
  configuracoes: {
    icon: "settings",
    title: "Configurações",
    subtitle: "Aparência e preferências",
  },
};

export async function render(
  view,
  boot,
  _params = {},
  query = new URLSearchParams(),
) {
  const sectionId = query.get("secao");
  if (sections[sectionId]) {
    renderSection(view, boot, sectionId);
    if (sectionId === 'configuracoes') mountPush(view);
    return;
  }
  renderOverview(view);
}

function renderOverview(view) {
  const u = store.user;
  const orderCount = store.orders.length;
  const couponCount = store.coupons.length;
  const initials = u.fullName.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('');

  view.innerHTML = `<div class="page profile-page">
    <header class="account-page-heading"><div><span class="account-kicker"><i></i>CENTRAL DO CLIENTE</span><h1>Olá, <strong>${esc(u.fullName.split(" ")[0])}</strong></h1><p>Gerencie sua conta e deixe o FoodCourt com a sua cara.</p></div><span class="account-security">${icon("shield")}<b>Conta protegida</b></span></header>
    <div class="profile-head">
      <div class="profile-avatar" aria-label="Seu perfil">${esc(initials)}</div>
      <div class="profile-user-copy"><h2>${esc(u.fullName)}</h2><div class="profile-contact">${icon("message")}<span>${esc(u.email)}</span></div>${u.phone ? `<div class="profile-contact">${icon("phone")}<span>${esc(u.phone)}</span></div>` : ""}<div class="pair profile-badges"><span class="badge badge-brand">${icon("star")} Nível ${esc(u.level)}</span><span class="badge badge-dark">${icon("calendar")} Membro desde ${esc(u.memberSince)}</span></div></div>
    </div>
    <div class="profile-stats"><div class="stat-box"><i>${icon("receipt")}</i><div><b>${orderCount}</b><span>PEDIDOS</span></div></div><div class="stat-box"><i>${icon("star")}</i><div><b>${u.points}</b><span>PONTOS FOODCOURT</span></div></div><div class="stat-box"><i>${icon("tag")}</i><div><b>${couponCount}</b><span>CUPONS</span></div></div></div>
    <section class="section account-menu-section"><div class="section-head"><div><h2>Sua conta</h2><div class="sub">Acesse rapidamente tudo que você precisa</div></div></div><div class="profile-menu-card"><div class="plist">
      ${item("user", "Minha conta", "Nome, e-mail e telefone", "#/perfil?secao=conta")}
      ${item("package", "Meus pedidos", "Em andamento e anteriores", "#/pedidos")}
      ${item("heart", "Favoritos", "Restaurantes e produtos", "#/favoritos")}
      ${item("pin", "Endereços", `${store.addresses.length} salvos`, "#/perfil?secao=enderecos")}
      ${item("wallet", "Pagamentos", "Pix, cartões e Apple Pay", "#/perfil?secao=pagamentos")}
      ${item("tag", "Cupons", `${couponCount} na carteira`, "#/ofertas")}
      ${item("star", "Programa de benefícios", `${u.cashback}% cashback ativo`, "#/fidelidade")}
      ${item("bell", "Notificações", "Alertas e novidades", "#/notificacoes")}
      ${item("chat", "Ajuda e suporte", "Pedidos, pagamentos e atendimento", "#/suporte")}
      ${u.platformAdmin ? item("shield", "Administração geral", "Gerenciar toda a plataforma FoodCourt", "#/admin") : ""}
      ${u.role === "courier" ? item("bike", "Portal do Entregador", "Corridas, rotas e ganhos", "#/entregador") : u.role === "merchant" || u.role === "admin" ? item("shop", "Portal do Parceiro", "Administrar estabelecimento", "#/parceiro") : `${item("bike", "Quero ser entregador", "Cadastre-se para realizar entregas", "#/quero-ser-entregador")}${item("store", "Venda no FoodCourt", "Tem um estabelecimento? Seja parceiro.", "#/para-estabelecimentos")}`}
      ${item("phone", "Instalar FoodCourt", "Adicionar à tela inicial", "#/instalar")}
      ${item("shield", "Segurança", "Alterar senha", "#/perfil?secao=seguranca")}
      ${item("lock", "Privacidade", "Exportar dados ou excluir conta", "#/perfil?secao=privacidade")}
      ${item("settings", "Configurações", "Aparência e preferências", "#/perfil?secao=configuracoes")}
    </div></div></section>
    <footer class="profile-signoff"><span>Seu próximo favorito está a um pedido de distância.</span><button class="btn btn-dark" id="logoutBtn">Sair da conta</button></footer>
  </div>`;

  view.querySelector("#logoutBtn")?.addEventListener("click", logout);
  view.querySelectorAll('.plist-item').forEach((card, index) => {
    card.style.setProperty('--entry-delay', `${Math.min(index, 8) * 35}ms`);
  });
}

function renderSection(view, boot, sectionId) {
  const section = sections[sectionId];
  view.innerHTML = `<div class="page profile-page profile-detail-page">
    <a class="profile-back" href="#/perfil" aria-label="Voltar ao perfil">← <span>Voltar ao perfil</span></a>
    <header class="profile-detail-head"><span class="profile-detail-icon">${icon(section.icon)}</span><div><span class="account-kicker">MINHA CONTA</span><h1>${esc(section.title)}</h1><p>${esc(section.subtitle)}</p></div></header>
    ${accountSubnav(sectionId)}
    ${sectionContent(sectionId, boot)}
  </div>`;
  bindSection(view, sectionId);
}

function sectionContent(sectionId, boot) {
  const u = store.user;
  if (sectionId === "conta")
    return `<div class="account-completion"><span><b>Dados salvos na sua conta</b><small>Nome e telefone são usados pela loja e pelo entregador para falar com você.</small></span></div><form class="card profile-detail-card profile-form" id="accountForm">
    <label>Nome completo<input class="input" name="fullName" value="${esc(u.fullName)}" required minlength="3" autocomplete="name"></label>
    <label>E-mail<input class="input" name="email" type="email" value="${esc(u.email)}" disabled><small class="field-hint">A troca de e-mail ainda não está disponível. Fale com o suporte se precisar alterar.</small></label>
    <label>Telefone<input class="input" name="phone" type="tel" value="${esc(u.phone)}" required autocomplete="tel-national"></label>
    <button class="btn btn-primary" type="submit" data-loading="Salvando...">Salvar alterações</button>
  </form>`;

  if (sectionId === "seguranca")
    return `<div class="detail-info-banner"><span>🔐</span><div><b>Senha da conta</b><small>Ao trocar a senha, os outros aparelhos conectados são desconectados.</small></div></div><form class="card profile-detail-card profile-form" id="passwordForm" autocomplete="off">
    ${u.hasPassword === false ? "" : `<label>Senha atual<input class="input" name="currentPassword" type="password" required autocomplete="current-password"></label>`}
    <label>Nova senha<input class="input" name="newPassword" type="password" required minlength="8" autocomplete="new-password"><small class="field-hint">Mínimo de 8 caracteres, com letras e números.</small></label>
    <label>Confirmar nova senha<input class="input" name="confirmPassword" type="password" required minlength="8" autocomplete="new-password"></label>
    <button class="btn btn-primary" type="submit" data-loading="Alterando...">Alterar senha</button>
  </form>`;

  if (sectionId === "privacidade")
    return `<div class="detail-info-banner"><span>🛡️</span><div><b>Seus direitos (LGPD)</b><small>Você pode baixar uma cópia dos seus dados ou excluir a conta a qualquer momento. Veja a <a href="#/privacidade">Política de Privacidade</a>.</small></div></div>
    <section class="card profile-detail-card profile-privacy-card">
      <h2>Exportar meus dados</h2>
      <p>Gera um arquivo JSON com sua conta, endereços, pedidos, pagamentos, avaliações, cupons e notificações.</p>
      <button class="btn btn-outline" type="button" data-export-account data-loading="Gerando...">Baixar cópia dos dados</button>
    </section>
    <section class="card profile-detail-card profile-privacy-card profile-danger-card">
      <h2>Excluir minha conta</h2>
      <p>Sua conta é encerrada e seus dados pessoais são removidos. Pedidos e pagamentos ficam guardados de forma anônima pelo prazo exigido por lei. Esta ação não pode ser desfeita.</p>
      <form id="deleteAccountForm">
        ${u.hasPassword === false
          ? `<label>Digite <b>EXCLUIR</b> para confirmar<input class="input" name="confirmation" required autocomplete="off"></label>`
          : `<label>Confirme com sua senha<input class="input" name="password" type="password" required autocomplete="current-password"></label>`}
        <button class="btn btn-danger" type="submit" data-loading="Excluindo...">Excluir conta definitivamente</button>
      </form>
    </section>`;

  if (sectionId === "enderecos")
    return `<div class="detail-info-banner"><span>🚴</span><div><b>Destino da próxima entrega</b><small>Toque em um endereço para torná-lo o principal.</small></div></div><div class="profile-option-list">${store.addresses
      .map((address) =>
        optionCard({
          id: address.id,
          group: "address",
          selected: store.address?.id === address.id,
          icon: address.emoji,
          title: address.label,
          description: `${address.street} · ${address.city}`,
        }),
      )
      .join(
        "",
      )}</div><form class="card profile-detail-card profile-form" data-address-form><h2>Adicionar endereço</h2><label>Identificação<input class="input" name="label" placeholder="Casa, trabalho..." required></label><label>CEP<input class="input" name="cep" inputmode="numeric" maxlength="9" required></label><label>Rua<input class="input" name="street" required></label><label>Número<input class="input" name="number" required></label><label>Complemento<input class="input" name="complement"></label><label>Bairro<input class="input" name="neighborhood" required></label><label>Cidade<input class="input" name="city" required></label><label>Estado<input class="input" name="state" maxlength="2" required></label><button class="btn btn-primary">Salvar endereço</button></form>`;

  if (sectionId === "pagamentos")
    return `<div class="detail-info-banner"><span>🔒</span><div><b>Pagamento seguro</b><small>Seus dados sensíveis não ficam expostos no FoodCourt.</small></div></div><div class="profile-option-list">${boot.paymentMethods
      .map((payment) =>
        optionCard({
          id: payment.id,
          group: "payment",
          selected: store.preferredPaymentId === payment.id,
          icon: payment.emoji,
          title: payment.name,
          description: payment.enabled ? payment.description : "Indisponível no momento",
        }),
      )
      .join("")}</div>`;

  if (sectionId === "beneficios") {
    const nextPoints = Math.max(0, 1500 - u.points);
    return `<div class="card dark-panel profile-benefits-card"><div class="benefit-medal">🏅</div><h2>Nível ${esc(u.level)}</h2><p>${nextPoints ? `Faltam ${nextPoints} pontos para o nível Ouro.` : "Você alcançou a meta do nível Ouro!"}</p><div class="freeship-bar"><div class="freeship-track"><div class="freeship-fill" style="width:${Math.min(100, (u.points / 1500) * 100)}%"></div></div></div><ul class="coupon-rules"><li>${u.cashback}% de cashback em cada pedido</li><li>Ofertas exclusivas de terça</li><li>Suporte prioritário 24/7</li></ul></div>`;
  }

  const preferences = store.preferences;
  return `<div class="card profile-settings-card">
    ${toggle("orderUpdates", "Atualizações dos pedidos", "Receber alertas sobre o andamento dos pedidos", preferences.orderUpdates)}
    ${toggle("promotions", "Promoções e cupons", "Receber ofertas e novidades do FoodCourt", preferences.promotions)}
    ${toggle("personalizedOffers", "Ofertas personalizadas", "Usar seu histórico para melhorar recomendações", preferences.personalizedOffers)}
    ${toggle("darkMode", "Modo escuro", "Alterar a aparência do aplicativo", document.documentElement.dataset.theme === "dark")}
  </div>`;
}

function bindSection(view, sectionId) {
  if (sectionId === "conta")
    view.querySelector("#accountForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formElement = event.currentTarget;
      const form = new FormData(formElement);
      const button = formElement.querySelector("button[type=submit]");
      button.disabled = true;
      try {
        const { user } = await api.updateProfile({
          fullName: String(form.get("fullName") || "").trim(),
          phone: String(form.get("phone") || "").trim(),
        });
        store.updateProfile(user);
        toast("Dados da conta atualizados.", "success");
      } catch (error) {
        toast(fieldMessage(error), "error");
      } finally {
        button.disabled = false;
      }
    });

  if (sectionId === "seguranca")
    view.querySelector("#passwordForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formElement = event.currentTarget;
      const form = Object.fromEntries(new FormData(formElement));
      const button = formElement.querySelector("button[type=submit]");
      if (form.newPassword !== form.confirmPassword) {
        toast("As senhas não coincidem.", "error");
        return;
      }
      button.disabled = true;
      try {
        const result = await api.changePassword(form);
        formElement.reset();
        toast(result.message || "Senha alterada.", "success");
      } catch (error) {
        toast(fieldMessage(error), "error");
      } finally {
        button.disabled = false;
      }
    });

  if (sectionId === "privacidade") {
    view.querySelector("[data-export-account]")?.addEventListener("click", async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      try {
        const data = await api.exportAccount();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `foodcourt-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        toast("Arquivo gerado.", "success");
      } catch (error) {
        toast(error.message, "error");
      } finally {
        button.disabled = false;
      }
    });
    view.querySelector("#deleteAccountForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formElement = event.currentTarget;
      if (!confirm("Excluir sua conta definitivamente? Esta ação não pode ser desfeita.")) return;
      const button = formElement.querySelector("button[type=submit]");
      button.disabled = true;
      try {
        await api.deleteAccount(Object.fromEntries(new FormData(formElement)));
        toast("Sua conta foi excluída.", "success");
        window.dispatchEvent(new Event("fc:logout"));
      } catch (error) {
        toast(fieldMessage(error), "error");
        button.disabled = false;
      }
    });
  }

  view.querySelectorAll("[data-address]").forEach((button) =>
    button.addEventListener("click", () => {
      store.setAddress(button.dataset.address);
      selectOnly(view, "[data-address]", button);
      toast("Endereço de entrega atualizado.", "success");
    }),
  );

  const addressForm = view.querySelector("[data-address-form]");
  addressForm?.elements.cep.addEventListener("blur", async (event) => {
    const cep = event.currentTarget.value.replace(/\D/g, "");
    if (cep.length !== 8) return;
    try {
      const { address } = await api.cep(cep);
      for (const field of ["street", "neighborhood", "city", "state"])
        if (addressForm.elements[field])
          addressForm.elements[field].value = address[field] || "";
    } catch (error) {
      toast(error.message, "error");
    }
  });
  addressForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector("button");
    button.disabled = true;
    try {
      const result = await api.saveAddress(
        Object.fromEntries(new FormData(event.currentTarget)),
      );
      store.addAddress(result.address);
      toast("Endereço salvo com segurança.", "success");
      location.hash = "#/perfil?secao=enderecos&at=" + Date.now();
    } catch (error) {
      toast(error.message, "error");
      button.disabled = false;
    }
  });

  view.querySelectorAll("[data-payment]").forEach((button) =>
    button.addEventListener("click", () => {
      store.setPreferredPayment(button.dataset.payment);
      selectOnly(view, "[data-payment]", button);
      toast("Pagamento preferido atualizado.", "success");
    }),
  );

  view.querySelectorAll("[data-preference]").forEach((input) =>
    input.addEventListener("change", () => {
      store.setPreference(input.dataset.preference, input.checked);
      if (input.dataset.preference === "darkMode")
        document.getElementById("themeBtn")?.click();
      toast("Preferência salva.", "success");
    }),
  );
}

// Erros de validação do servidor chegam em `fields`; mostra o primeiro.
function fieldMessage(error) {
  const fields = error?.data?.fields || error?.fields;
  const first = fields && Object.values(fields)[0];
  return first || error?.message || "Não foi possível concluir.";
}

function selectOnly(view, selector, selected) {
  view.querySelectorAll(selector).forEach((button) => {
    const active = button === selected;
    button.classList.toggle("selected", active);
    button.setAttribute("aria-pressed", String(active));
    button.querySelector(".profile-option-check").textContent = active
      ? "✓"
      : "";
  });
}

function optionCard({ id, group, selected, icon, title, description }) {
  return `<button class="card profile-option ${selected ? "selected" : ""}" data-${group}="${esc(id)}" aria-pressed="${selected}"><span class="profile-option-icon">${icon}</span><span><b>${esc(title)}</b><small>${esc(description)}</small></span><i class="profile-option-check">${selected ? "✓" : ""}</i></button>`;
}

function toggle(id, title, description, checked) {
  return `<label class="profile-toggle"><span><b>${title}</b><small>${description}</small></span><input type="checkbox" data-preference="${id}" ${checked ? "checked" : ""}><i aria-hidden="true"></i></label>`;
}

function accountSubnav(active) {
  return `<nav class="account-subnav no-scrollbar" aria-label="Áreas da conta">
    ${Object.entries(sections)
      .map(
        ([id, section]) =>
          `<a class="${id === active ? "active" : ""}" href="#/perfil?secao=${id}"><span>${icon(section.icon)}</span>${section.title}</a>`,
      )
      .join("")}
  </nav>`;
}

function item(iconName, label, sub, href) {
  const opensPartnerTab =
    href === "#/parceiro" || href.startsWith("#/para-estabelecimentos");
  const externalTab = opensPartnerTab
    ? ' target="_blank" rel="noopener noreferrer"'
    : "";
  return `<a class="plist-item" data-profile-icon="${iconName}" href="${href}"${externalTab}><span class="plist-emoji">${icon(iconName)}</span><span class="pl-label">${label}<span class="pl-sub">${sub}</span></span><span class="chev">${icon("chevron")}</span></a>`;
}

async function logout(event) {
  const button = event.currentTarget;
  button.disabled = true;
  button.textContent = "Saindo...";
  try {
    await api.logout();
  } catch {}
  window.dispatchEvent(new Event("fc:logout"));
}

import { api } from "../core/api.js";
import { esc, toast } from "../core/ui.js";

export async function render(view) {
  let payload = await api.customerSupport().catch(() => ({ tickets: [] }));
  draw();

  function draw() {
    view.innerHTML = `<div class="page customer-feature-page"><a class="profile-back" href="#/perfil">← Voltar ao perfil</a><header class="destination-heading"><span class="destination-icon">💬</span><div><span class="account-kicker">CENTRAL DE AJUDA</span><h1>Como podemos ajudar?</h1><p>Abra um atendimento e converse com nossa equipe por aqui.</p></div></header><div class="support-layout"><section class="card support-form-card"><h2>Novo atendimento</h2><p>Conte o que aconteceu. Não envie senhas ou dados completos do cartão.</p><form id="supportForm"><select class="input" name="subject"><option>Problema com pedido</option><option>Item faltando ou incorreto</option><option>Pagamento e cobrança</option><option>Cancelamento ou reembolso</option><option>Conta e segurança</option><option>Outro assunto</option></select><input class="input" name="orderId" placeholder="Número do pedido (opcional)"><textarea class="input" name="message" rows="5" maxlength="1000" placeholder="Descreva o problema" required></textarea><button class="btn btn-primary">Enviar solicitação</button></form></section><section class="support-tickets"><h2>Seus atendimentos</h2>${payload.tickets.length ? payload.tickets.map((ticket) => `<article class="card support-ticket"><span class="badge ${ticket.status === "open" ? "badge-brand" : "badge-green"}">${ticket.status === "open" ? "ABERTO" : "RESOLVIDO"}</span><h3>${esc(ticket.subject)}</h3>${ticket.orderId ? `<small>Pedido #${esc(ticket.orderId)}</small>` : ""}<div class="support-thread">${ticket.messages.map((message) => `<div class="${message.from === "support" ? "from-support" : "from-customer"}"><b>${message.from === "support" ? "Equipe FoodCourt" : "Você"}</b><p>${esc(message.text)}</p><small>${new Date(message.at).toLocaleString("pt-BR")}</small></div>`).join("")}</div><form data-ticket-reply="${ticket.id}" class="pair"><input class="input" name="message" maxlength="1000" placeholder="${ticket.status === "resolved" ? "Responder para reabrir" : "Escreva uma mensagem"}" required><button class="btn btn-outline">Enviar</button></form><small>#${esc(ticket.id)} · aberto em ${new Date(ticket.createdAt).toLocaleDateString("pt-BR")}</small></article>`).join("") : '<div class="empty-modern"><span>💬</span><div><h3>Nenhum atendimento</h3><p>Quando precisar, estaremos aqui.</p></div></div>'}</section></div></div>`;
    view
      .querySelector("#supportForm")
      ?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const button = event.currentTarget.querySelector("button"),
          form = new FormData(event.currentTarget);
        button.disabled = true;
        try {
          const result = await api.createSupportTicket({
            subject: form.get("subject"),
            orderId: form.get("orderId"),
            message: form.get("message"),
          });
          payload.tickets.unshift(result.ticket);
          toast("Solicitação enviada.", "success");
          draw();
        } catch (error) {
          toast(error.message, "error");
          button.disabled = false;
        }
      });
    view.querySelectorAll("[data-ticket-reply]").forEach((form) =>
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const button = event.currentTarget.querySelector("button"),
          data = new FormData(event.currentTarget);
        button.disabled = true;
        try {
          const result = await api.createSupportTicket({
            id: event.currentTarget.dataset.ticketReply,
            message: data.get("message"),
          });
          payload.tickets = payload.tickets.map((ticket) =>
            ticket.id === result.ticket.id ? result.ticket : ticket,
          );
          toast("Mensagem enviada.", "success");
          draw();
        } catch (error) {
          toast(error.message, "error");
          button.disabled = false;
        }
      }),
    );
  }
}

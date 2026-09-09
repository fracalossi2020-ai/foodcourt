import { api } from "./api.js";
import { store } from "./store.js";
import { esc, money, toast } from "./ui.js";
import { renderCartUI } from "./cart.js";

let timer;
let generation = 0;
export function cleanupPayment() {
  clearTimeout(timer);
  generation++;
}
export function rememberCart(id, attemptKey) {
  try {
    sessionStorage.setItem(
      "fc:payment-cart:" + id,
      JSON.stringify(store.cart.items),
    );
    sessionStorage.setItem(
      "fc:payment-attempt:" + id,
      JSON.stringify({
        key: attemptKey,
        value: sessionStorage.getItem(attemptKey),
      }),
    );
  } catch {}
}

export async function renderPayment(view, id) {
  cleanupPayment();
  const current = generation;
  view.innerHTML =
    '<div class="page payment-status-page" aria-live="polite">Consultando pagamento...</div>';
  let previous = "";
  async function refresh() {
    try {
      const { payment } = await api.payment(id);
      if (current !== generation) return;
      const paid = payment.status === "paid";
      const cancelledOrders =
        payment.orders.length &&
        payment.orders.every((order) => order.status === "cancelled");
      const terminal =
        paid ||
        ["cancelled", "expired", "refunded", "charged_back"].includes(
          payment.status,
        ) ||
        cancelledOrders;
      const expired = Date.parse(payment.expiresAt) <= Date.now();
      if (terminal) {
        try {
          const attempt = JSON.parse(
            sessionStorage.getItem("fc:payment-attempt:" + id),
          );
          if (attempt && sessionStorage.getItem(attempt.key) === attempt.value)
            sessionStorage.removeItem(attempt.key);
        } catch {}
      }
      const labels = {
        paid: "Pagamento aprovado",
        pending: "Aguardando pagamento",
        creating: "Preparando pagamento",
        failed: "Pagamento não aprovado",
        expired: "Pagamento expirado",
        cancelled: "Pagamento cancelado",
        refunded: "Pagamento estornado",
        charged_back: "Pagamento contestado",
        refund_pending: "Estorno em processamento",
      };
      if (paid) {
        try {
          if (
            sessionStorage.getItem("fc:payment-cart:" + id) ===
            JSON.stringify(store.cart.items)
          ) {
            store.cartClear();
            renderCartUI();
          }
          sessionStorage.removeItem("fc:payment-cart:" + id);
        } catch {}
      }
      const signature = JSON.stringify(payment) + expired;
      if (signature !== previous) {
        previous = signature;
        view.innerHTML = `<section class="page payment-status-page"><span class="checkout-kicker">PAGAMENTO DO PEDIDO</span><h1 aria-live="polite">${cancelledOrders ? "Pedido cancelado" : labels[payment.status] || "Consultando pagamento"}</h1><strong class="payment-status-total">${money(payment.amount)}</strong><p>${cancelledOrders ? "Se houve cobrança, acompanhe o estorno nos pedidos." : paid ? "A confirmação foi recebida do provedor. Acompanhe o preparo nos seus pedidos." : terminal ? "Este pagamento foi encerrado. Você pode consultar seus pedidos ou voltar ao carrinho." : "A loja poderá aceitar o pedido quando o pagamento for aprovado."}</p>
          ${!terminal && !expired && payment.payload ? `<div class="payment-pix-code"><img src="${esc(payment.qrCode)}" alt="QR Code Pix do pedido"><label>Pix copia e cola<input readonly value="${esc(payment.payload)}" data-code></label><button type="button" class="btn btn-primary" data-copy>Copiar código Pix</button></div>` : ""}
          ${!terminal && !expired && payment.url ? `<a class="btn btn-primary" href="${esc(payment.url)}" rel="noopener">${payment.method === "apple_pay" ? "Continuar para Apple Pay / cartão" : "Continuar para pagamento seguro"}</a>` : ""}
          ${!terminal ? `<p>${expired ? "O prazo terminou. Estamos conferindo a situação com o provedor." : `Válido até ${esc(new Date(payment.expiresAt).toLocaleString("pt-BR"))}.`}</p><button type="button" class="btn btn-outline" data-refresh>Verificar pagamento</button><button type="button" class="btn btn-ghost" data-cancel>Cancelar pedido</button>` : ""}
          <div class="payment-status-links"><a class="btn btn-outline" href="#/pedidos">Ver meus pedidos</a><a class="btn btn-ghost" href="#/inicio">Voltar ao início</a></div><p data-payment-error role="status"></p></section>`;
        view
          .querySelector("[data-copy]")
          ?.addEventListener("click", async () => {
            try {
              await navigator.clipboard.writeText(payment.payload);
              toast("Código Pix copiado.", "success");
            } catch {
              view.querySelector("[data-code]")?.select();
              toast("Selecione e copie o código Pix.", "info");
            }
          });
        view.querySelector("[data-refresh]")?.addEventListener("click", () => {
          clearTimeout(timer);
          refresh();
        });
        view
          .querySelector("[data-cancel]")
          ?.addEventListener("click", async (event) => {
            event.currentTarget.disabled = true;
            try {
              await api.cancelPayment(id);
              previous = "";
              await refresh();
            } catch (error) {
              toast(error.message, "error");
              if (current === generation) {
                previous = "";
                await refresh();
              }
            }
          });
      }
      if (!terminal) {
        clearTimeout(timer);
        timer = setTimeout(refresh, 5000);
      }
    } catch (error) {
      if (current !== generation) return;
      const target = view.querySelector("[data-payment-error]");
      if (target)
        target.textContent =
          "Não foi possível atualizar agora. Tentaremos novamente.";
      else
        view.innerHTML = `<div class="page payment-status-page"><h1>Não foi possível consultar o pagamento</h1><p>${esc(error.message)}</p><a href="#/pedidos">Ver meus pedidos</a></div>`;
      if (![401, 404].includes(error.status)) {
        clearTimeout(timer);
        timer = setTimeout(refresh, 10000);
      }
    }
  }
  await refresh();
}

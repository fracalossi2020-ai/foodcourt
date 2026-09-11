import { api } from './api.js';
import { esc, toast } from './ui.js';
export function mountStoreAddress(view, store) {
  const target = view.querySelector('[data-store-form]');
  if (!target) return;
  const form = document.createElement('form'); form.className = 'partner-panel'; form.dataset.storeAddress = '';
  const fields = [['street', 'Rua', true], ['number', 'Número', true], ['neighborhood', 'Bairro', false], ['city', 'Cidade', true], ['state', 'UF', true], ['cep', 'CEP', true], ['complement', 'Complemento', false]];
  form.innerHTML = `<h2>Endereço da loja</h2><p>Usado na retirada, navegação do entregador e cálculo do frete.</p><div style="display:grid;gap:12px">${fields.map(([field, label, required]) => `<label>${label}<input class="input" name="${field}" value="${esc(store.address?.[field] || '')}" ${required ? 'required' : ''} maxlength="${field === 'state' ? 2 : field === 'cep' ? 9 : 160}"></label>`).join('')}</div><button class="btn btn-primary" style="margin-top:16px">Salvar endereço</button>`;
  target.after(form);
  form.onsubmit = async event => {
    event.preventDefault(); const button = form.querySelector('button'); button.disabled = true;
    try { await api.updatePartnerStore({ address: Object.fromEntries(new FormData(form)) }); toast('Endereço atualizado.', 'success'); }
    catch (error) { toast(error.message, 'error'); }
    finally { button.disabled = false; }
  };
}

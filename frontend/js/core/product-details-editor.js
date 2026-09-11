export function productDetailsEditor(form, product = {}) {
  form.querySelector('[data-product-details]')?.remove();
  const group = document.createElement('fieldset');
  group.dataset.productDetails = '';
  group.style.cssText = 'display:grid;gap:12px;border:1px solid var(--border);border-radius:12px;padding:14px;grid-column:1/-1';
  group.innerHTML = '<legend>Disponibilidade e ingredientes</legend><label>Pausar vendas até<input class="input" type="datetime-local" name="pausedUntil"></label><small>Horário deste dispositivo. Deixe vazio para retirar a pausa. Ao terminar, o produto volta se estiver disponível e com estoque.</small><label>Características alimentares<input class="input" name="dietary" placeholder="Ex.: Vegetariano, Vegano"></label><label>Alérgenos informados<input class="input" name="allergens" placeholder="Ex.: Leite, Soja"></label><small>Separe por vírgulas. Informe apenas características verificadas; campo vazio não significa ausência de alérgenos.</small>';
  form.querySelector('div:last-child').before(group);
  form.elements.dietary.value = (product.dietary || []).join(', ');
  form.elements.allergens.value = (product.allergens || []).join(', ');
  if (Date.parse(product.pausedUntil) > Date.now()) {
    const date = new Date(product.pausedUntil);
    form.elements.pausedUntil.value = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }
}
export function readProductDetails(form) {
  const list = name => form.elements[name].value.split(',').map(item => item.trim()).filter(Boolean);
  return { dietary: list('dietary'), allergens: list('allergens'), pausedUntil: form.elements.pausedUntil.value ? new Date(form.elements.pausedUntil.value).toISOString() : null };
}

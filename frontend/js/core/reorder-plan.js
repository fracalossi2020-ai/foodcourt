export function planReorder(order, restaurant) {
  const products = (restaurant.menu || []).flatMap(category => category.items || []);
  const remaining = new Map();
  const items = [], warnings = [];
  for (const [index, old] of (order.items || []).entries()) {
    const product = products.find(item => item.id === (old.productId || old.id));
    const label = product?.name || old.name || 'Produto';
    if (!product || product.available === false) { warnings.push(`${label}: indisponível no cardápio atual.`); continue; }
    const names = old.optionNames || old.options || [];
    const groups = product.options || [];
    const choices = groups.flatMap(group => group.choices || []);
    if (names.some(name => !choices.some(choice => choice.name === name)) || groups.some(group => {
      const count = names.filter(name => group.choices.some(choice => choice.name === name)).length;
      return (group.required && !count) || (group.type === 'single' && count > 1);
    })) { warnings.push(`${label}: as opções mudaram; personalize novamente no cardápio.`); continue; }
    const stock = remaining.has(product.id) ? remaining.get(product.id) : product.stock == null ? Infinity : Number(product.stock);
    const requested = Number(old.quantity ?? old.qty);
    const qty = Math.min(requested, stock);
    if (!Number.isInteger(qty) || qty <= 0) { warnings.push(`${label}: sem estoque disponível.`); continue; }
    remaining.set(product.id, stock - qty);
    if (qty < requested) warnings.push(`${label}: quantidade reduzida para ${qty} por falta de estoque.`);
    const unitPrice = Math.round((Number(product.promoPrice ?? product.price) + names.reduce((sum, name) => sum + Number(choices.find(choice => choice.name === name).price || 0), 0)) * 100) / 100;
    if (!Number.isFinite(unitPrice) || unitPrice < 0) { warnings.push(`${label}: preço indisponível.`); continue; }
    if (Number(old.unitPrice) !== unitPrice) warnings.push(`${label}: preço atualizado conforme o cardápio.`);
    items.push({ id: product.id, uid: `${product.id}-repeat-${index}`, name: product.name, emoji: product.emoji || '🍔', qty, unitPrice, optionNames: [...names], note: String(old.note || '').slice(0, 500) });
  }
  return { items, warnings, subtotal: items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0) };
}

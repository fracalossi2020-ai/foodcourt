export function mountNavigation(view, delivery) {
  if (!delivery) return;
  const section = view.querySelector('.courier-route');
  if (!section) return;
  const actions = document.createElement('div'); actions.className = 'pair'; actions.style.cssText = 'flex-wrap:wrap;margin:14px 0';
  const format = address => typeof address === 'string' ? address.split(' — ').at(-1) : [address?.street, address?.number, address?.neighborhood, address?.city, address?.state, address?.cep].filter(Boolean).join(', ');
  for (const [label, address] of [['Rota até a loja', delivery.pickupAddress], ['Rota até o cliente', delivery.dropoffAddress]]) {
    const destination = format(address);
    if (!destination) continue;
    const url = new URL('https://www.google.com/maps/dir/');
    url.searchParams.set('api', '1'); url.searchParams.set('destination', destination); url.searchParams.set('dir_action', 'navigate');
    const link = document.createElement('a'); link.className = 'btn btn-outline'; link.textContent = label; link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer'; actions.append(link);
  }
  const note = document.createElement('p'); note.textContent = 'Confira o destino e o modo de transporte no aplicativo de mapas antes de iniciar.';
  section.after(actions, note);
}

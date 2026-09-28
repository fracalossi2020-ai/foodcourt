// Dedicated duotone pictograms for the partner workspace (24px grid).
const drawings = {
  dashboard: '<path class="partner-icon-tone" d="M3 14h4v7H3zm7-5h4v12h-4zm7-6h4v18h-4z"/><path d="M4 11 10 5l4 2 6-5M3 21h18M5 17v1m7-6v6m7-11v11"/>',
  pedidos: '<path class="partner-icon-tone" d="M5 5h14v16l-3-2-4 2-4-2-3 2z"/><path d="M8 5V3h8v2M5 5h14v16l-3-2-4 2-4-2-3 2V5Z M8 9h5m-5 4h3m4 0 2 2 4-4"/>',
  cardapio: '<path class="partner-icon-tone" d="M3 13a9 9 0 0 1 18 0z"/><path d="M3 13a9 9 0 0 1 18 0M2 16h20M5 20h14M12 4V2M7 8l1-1m10-4 2-1"/>',
  promocoes: '<path class="partner-icon-tone" d="m13 2-9 12h7l-1 8 10-13h-7z"/><path d="m13 2-9 12h7l-1 8 10-13h-7l0-7Z M3 5l2 1m14 13 2 1"/>',
  financeiro: '<rect class="partner-icon-tone" x="3" y="5" width="18" height="15" rx="4"/><path d="M4 8V6a3 3 0 0 1 3-3h9M18 10h3v7h-3a3.5 3.5 0 0 1 0-7Z M21 9V8a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3M17 13.5h.01"/>',
  avaliacoes: '<path class="partner-icon-tone" d="M3 3h18v14H9l-6 4z"/><path d="M7 3h10a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4H9l-6 4V7a4 4 0 0 1 4-4Z m5 3 1.2 2.5 2.8.4-2 2 .5 2.8-2.5-1.3-2.5 1.3.5-2.8-2-2 2.8-.4Z"/>',
  minhaloja: '<path class="partner-icon-tone" d="M4 10h16v11H4zM3 4h18l1 6H2z"/><path d="M4 12v9h16v-9M2 10l2-6h16l2 6M2 10q2 4 5 0 2 4 5 0 2 4 5 0 3 4 5 0M9 21v-6h6v6"/>',
  horarios: '<circle class="partner-icon-tone" cx="12" cy="12" r="9"/><path d="M20 8a9 9 0 1 0 1 6M12 7v5l3 2M18 3l3 1-1 3M12 3v1M3 12h1M12 20v1"/>',
  plano: '<path class="partner-icon-tone" d="m12 2 9 5v10l-9 5-9-5V7z"/><path d="m12 2 9 5v10l-9 5-9-5V7l9-5Z m-4 10 3 3 5-6"/>',
  configuracoes: '<rect class="partner-icon-tone" x="3" y="3" width="18" height="18" rx="5"/><path d="M7 6v12M17 6v12M12 6v12"/><rect x="5" y="8" width="4" height="4" rx="1"/><rect x="10" y="13" width="4" height="4" rx="1"/><rect x="15" y="7" width="4" height="4" rx="1"/>',
  equipe: '<path class="partner-icon-tone" d="M2 21v-4a5 5 0 0 1 10 0v4zM14 21v-3a4 4 0 0 1 8 0v3z"/><circle cx="8" cy="7" r="3"/><circle cx="18" cy="9" r="2.5"/><path d="M2 21v-3a6 6 0 0 1 12 0v3M16 15a5 5 0 0 1 6 5v1"/>',
  suporte: '<path class="partner-icon-tone" d="M3 10h4v8H3zM17 10h4v8h-4z"/><path d="M3 11V9a9 9 0 0 1 18 0v5M3 11h4v7H5a2 2 0 0 1-2-2v-5Zm18 0h-4v7h2a2 2 0 0 0 2-2v-5ZM19 18v1a3 3 0 0 1-3 3h-4"/>',
};
export function partnerIcon(name) {
  return `<svg class="partner-pictogram" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${drawings[name] || drawings.dashboard}</svg>`;
}

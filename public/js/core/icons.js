const paths = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  pin: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.9-8.6a5.5 5.5 0 0 0-.1-7.8Z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  bike: '<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.5 18h5l2-7h-5M14 13h5l2 5M7 8h4"/>',
  tag: '<path d="M3 4h8l10 10-7 7L4 11V4Z"/><circle cx="8" cy="8" r="1.2"/>',
  star: '<path d="m12 2 3 6 7 .9-5 4.8 1.2 6.8L12 17.3l-6.2 3.2L7 13.7 2 8.9 9 8l3-6Z"/>',
  store: '<path d="M4 10v10h16V10M3 4h18l-2 6H5L3 4Z"/><path d="M9 20v-6h6v6"/>',
  bag: '<path d="M5 8h14l1 13H4L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>',
  flame: '<path d="M13 2s1 4-2 6c-3 2-5 4-5 8a6 6 0 0 0 12 0c0-3-2-5-4-7 0 3-2 4-3 4 1-4-1-7 2-11Z"/>',
  percent: '<circle cx="7" cy="7" r="2"/><circle cx="17" cy="17" r="2"/><path d="m19 5-14 14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  burger: '<path d="M4 11h16M5 11a7 7 0 0 1 14 0M4 15h16M5 19h14a1 1 0 0 0 1-1v-1H4v1a1 1 0 0 0 1 1Z"/>',
  pizza: '<path d="m4 20 16-7L11 4 4 20Z"/><path d="M11 4c3 1 6 4 9 9M11 10h.01M14 14h.01M8 15h.01"/>',
  sushi: '<ellipse cx="12" cy="7" rx="7" ry="3"/><path d="M5 7v10c0 1.7 3.1 3 7 3s7-1.3 7-3V7M9 7h6"/>',
  salad: '<path d="M4 10h16c0 6-3 10-8 10S4 16 4 10Z"/><path d="M8 10c-2-3 0-5 2-6M12 10c0-4 3-5 5-5M15 10c2-2 4-1 5 0"/>',
  chicken: '<path d="M7 15c-3-3-2-7 1-9s7-1 9 2 1 6-2 8-5 2-8-1Z"/><path d="m7 15-2 2M5 17l-2-1M5 17l1 2"/>',
  taco: '<path d="M4 17a8 8 0 0 1 16 0H4Z"/><path d="M7 13h.01M11 11h.01M15 13h.01"/>',
  pasta: '<path d="M4 9h16l-2 11H6L4 9Z"/><path d="M7 5c1 2 2 2 3 0s2-2 3 0 2 2 4 0"/>',
  cake: '<path d="M5 11h14v9H5v-9ZM7 11V8h10v3M12 8V4"/><path d="M10 4h4"/>',
  coffee: '<path d="M5 8h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5V8Z"/><path d="M17 10h2a2 2 0 0 1 0 4h-2M8 4v2M12 3v3"/>',
  drink: '<path d="M7 3h10l-1 18H8L7 3ZM8 8h8M14 3l3-2"/>',
  market: '<path d="M3 4h2l2 11h10l3-8H6M9 20h.01M17 20h.01"/>'
}

export function icon(name, className = '') {
  return `<svg class="fc-icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.store}</svg>`
}

export const categoryIcon = id => icon({ burger:'burger', pizza:'pizza', japanese:'sushi', healthy:'salad', chicken:'chicken', mexican:'taco', pasta:'pasta', dessert:'cake', coffee:'coffee', drinks:'drink', market:'market' }[id] || 'store')

const copy = {
  burger: { offers: 'Ofertas de Hambúrguer', restaurants: 'Hamburguerias para você', products: 'Hambúrgueres mais pedidos' },
  pizza: { offers: 'Ofertas de Pizza para você', restaurants: 'Restaurantes de Pizza', products: 'Pizzas mais pedidas' },
  japanese: { offers: 'Ofertas de Japonês para você', restaurants: 'Restaurantes Japoneses', products: 'Mais pedidos em Japonês' },
  healthy: { offers: 'Ofertas Saudáveis', restaurants: 'Restaurantes Saudáveis', products: 'Opções saudáveis mais pedidas' },
  chicken: { offers: 'Ofertas de Frango', restaurants: 'Casas de Frango para você', products: 'Frangos mais pedidos' },
  mexican: { offers: 'Sabores mexicanos para você', restaurants: 'Restaurantes Mexicanos', products: 'Mexicanos mais pedidos' },
  pasta: { offers: 'Ofertas de Massas', restaurants: 'Casas de Massas para você', products: 'Massas mais pedidas' },
  dessert: { offers: 'Ofertas de Sobremesas', restaurants: 'Docerias para você', products: 'Sobremesas mais pedidas' },
  coffee: { offers: 'Ofertas de Cafés', restaurants: 'Cafeterias para você', products: 'Cafés mais pedidos' },
  drinks: { offers: 'Ofertas de Bebidas', restaurants: 'Lojas de Bebidas', products: 'Bebidas mais pedidas' },
  market: { offers: 'Ofertas de Mercado', restaurants: 'Mercados para você', products: 'Itens de mercado mais pedidos' }
}

export function filterByCategory(items, categoryId) {
  if (!categoryId || categoryId === 'all') return items
  return items.filter(item => item.categoryId === categoryId || item.categoryId === 'all' || item.categories?.includes(categoryId))
}

export function discoveryTitles(categoryId) {
  return copy[categoryId] || { offers: 'Ofertas para você', restaurants: 'Recomendados para você', products: 'Mais pedidos na demonstração' }
}

export function validCategory(categoryId, categories) {
  return categories.some(category => category.id === categoryId) ? categoryId : 'all'
}

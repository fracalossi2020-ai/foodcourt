const categoryDemo = {
  burger: { names: ['Urban Burger', 'Bacon House'], products: ['Smash Duplo', 'X-Bacon Especial', 'Cheddar Burger', 'Combo Urban'], emoji: '🍔' },
  pizza: { names: ['Forno 360', 'Bella Pizza'], products: ['Pizza Calabresa', 'Pizza Portuguesa', 'Pizza Marguerita', 'Pizza Frango com Catupiry'], emoji: '🍕' },
  japanese: { names: ['Tokyo House', 'Nori Sushi'], products: ['Combo Sushi', 'Temaki Salmão', 'Hot Roll', 'Sashimi Especial'], emoji: '🍣' },
  healthy: { names: ['Leve & Verde', 'Bowl Natural'], products: ['Bowl Proteico', 'Salada Mediterrânea', 'Wrap Integral', 'Suco Detox'], emoji: '🥗' },
  chicken: { names: ['Chicken Station', 'Rei do Frango'], products: ['Balde Crocante', 'Asinhas BBQ', 'Frango Empanado', 'Combo Família'], emoji: '🍗' },
  mexican: { names: ['Casa Azteca', 'Guacamole'], products: ['Taco de Carne', 'Burrito Especial', 'Nachos Supreme', 'Quesadilla'], emoji: '🌮' },
  pasta: { names: ['Cantina Roma', 'Pasta & Cia'], products: ['Fettuccine Alfredo', 'Lasanha Bolonhesa', 'Nhoque ao Sugo', 'Penne Primavera'], emoji: '🍝' },
  dessert: { names: ['Mundo Doce', 'Brigadeiro Real'], products: ['Brownie Cremoso', 'Bolo de Chocolate', 'Cheesecake', 'Caixa de Brigadeiros'], emoji: '🍰' },
  coffee: { names: ['Grão Nobre', 'Café Central'], products: ['Cappuccino', 'Café Coado', 'Croissant', 'Combo Café da Manhã'], emoji: '☕' },
  drinks: { names: ['Fresh Bebidas', 'Estação dos Sucos', 'Gelada Express'], products: ['Suco de Laranja', 'Limonada Suíça', 'Refrigerante Gelado', 'Água de Coco'], emoji: '🥤' },
  market: { names: ['Mercado Rápido', 'Despensa Fácil'], products: ['Kit Café da Manhã', 'Cesta de Frutas', 'Combo Limpeza', 'Kit Pipoca'], emoji: '🛒' }
}

const offerTemplates = [
  (label) => ({ title: `20% OFF em ${label}`, description: 'Seleção especial da categoria', discount: 20, type: 'discount' }),
  (label) => ({ title: `Combo de ${label}`, description: 'Itens selecionados por um preço especial', discount: 15, type: 'combo' }),
  () => ({ title: 'Frete grátis acima de R$ 50', description: 'Válido nos estabelecimentos participantes', discount: 0, type: 'shipping' })
]

function slug(value) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function product(id, name, categoryId, emoji, index) {
  const price = 18.9 + index * 7
  return {
    id, categoryId, name,
    description: `${name} preparado especialmente para esta demonstração`,
    price: Number((price + 5).toFixed(2)), promoPrice: Number(price.toFixed(2)),
    discount: 15, emoji, popular: true, options: 'simple', demo: true,
    calories: 320 + index * 85,
    dietary: categoryId === 'healthy' ? ['Opção equilibrada'] : [],
    allergens: ['burger','pizza','pasta','dessert'].includes(categoryId) ? ['Glúten','Leite'] : []
  }
}

function createDemoData(categories, existingRestaurants) {
  const restaurants = []
  const offers = []

  for (const category of categories) {
    const config = categoryDemo[category.id]
    if (!config) continue
    const existingCount = existingRestaurants.filter(r => r.categoryId === category.id).length
    const required = Math.max(0, 3 - existingCount)

    config.names.slice(0, required).forEach((name, restaurantIndex) => {
      const id = `demo-${category.id}-${slug(name)}`
      const items = config.products.map((name, productIndex) => product(`${id}-p${productIndex + 1}`, name, category.id, config.emoji, productIndex))
      restaurants.push({
        id, name, category: category.name, categoryId: category.id,
        tags: [category.query, category.name, ...config.products],
        rating: Number((4.5 + ((restaurantIndex + category.id.length) % 4) / 10).toFixed(1)),
        reviews: 320 + category.id.length * 41 + restaurantIndex * 137,
        deliveryTime: [25 + restaurantIndex * 5, 40 + restaurantIndex * 5],
        deliveryFee: restaurantIndex === 0 ? 0 : 4.99,
        freeShippingMin: restaurantIndex === 0 ? 0 : 50,
        distance: 1.1 + restaurantIndex * 0.7,
        priceRange: '$$', open: true,
        promo: restaurantIndex === 0 ? `20% OFF em ${category.name}` : `Combo ${category.name}`,
        badge: 'DEMONSTRAÇÃO', logo: config.emoji,
        cover: 'linear-gradient(135deg,#eaf7ef,#cdebd9 55%,#f6fcf8)',
        benefits: ['Dados de demonstração'], demo: true,
        menu: [{ name: 'Mais pedidos', items }]
      })
    })

    offerTemplates.forEach((makeOffer, index) => offers.push({
      id: `offer-${category.id}-${index + 1}`, categoryId: category.id,
      ...makeOffer(category.name), demo: true
    }))
  }

  return { restaurants, offers }
}

module.exports = { createDemoData }

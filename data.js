const categories = [
  { id: 'burger', name: 'Hambúrguer', emoji: '🍔', query: 'hambúrguer' },
  { id: 'pizza', name: 'Pizza', emoji: '🍕', query: 'pizza' },
  { id: 'japanese', name: 'Japonês', emoji: '🍣', query: 'japonês' },
  { id: 'healthy', name: 'Saudável', emoji: '🥗', query: 'saudável' },
  { id: 'chicken', name: 'Frango', emoji: '🍗', query: 'frango' },
  { id: 'mexican', name: 'Mexicano', emoji: '🌮', query: 'mexicano' },
  { id: 'pasta', name: 'Massas', emoji: '🍝', query: 'massas' },
  { id: 'dessert', name: 'Sobremesas', emoji: '🍰', query: 'sobremesa' },
  { id: 'coffee', name: 'Cafés', emoji: '☕', query: 'café' },
  { id: 'drinks', name: 'Bebidas', emoji: '🥤', query: 'bebidas' },
  { id: 'market', name: 'Mercado', emoji: '🛒', query: 'mercado' }
]

const banners = [
  {
    id: 'b1', tag: 'OFERTA RELÂMPAGO', title: 'Combos Neon com 20% OFF',
    subtitle: 'Só hoje nos hambúrgueres selecionados', cta: 'Ver ofertas',
    href: '#/ofertas', emoji: '🍔', tone: 'orange'
  },
  {
    id: 'b2', tag: 'FRETE GRÁTIS', title: 'Entrega grátis acima de R$ 30',
    subtitle: 'Em dezenas de restaurantes perto de você', cta: 'Encontrar restaurantes',
    href: '#/buscar?filtro=frete-gratis', emoji: '🚴', tone: 'dark'
  },
  {
    id: 'b3', tag: 'CUPOM', title: 'R$ 10 OFF no primeiro pedido',
    subtitle: 'Use o cupom BEMVINDO10 no checkout', cta: 'Resgatar cupom',
    href: '#/ofertas', emoji: '🎟️', tone: 'orange'
  },
  {
    id: 'b4', tag: 'NOVIDADE', title: 'Mercado em até 40 minutos',
    subtitle: 'Mercado Express agora no Food Court', cta: 'Explorar mercado',
    href: '#/buscar?q=mercado', emoji: '🛒', tone: 'dark'
  }
]

const optionGroups = {
  burger: [
    {
      name: 'Escolha seu pão', type: 'single', required: true,
      choices: [
        { name: 'Brioche', price: 0 },
        { name: 'Tradicional', price: 0 },
        { name: 'Integral', price: 2 }
      ]
    },
    {
      name: 'Adicionais', type: 'multi', required: false,
      choices: [
        { name: 'Queijo cheddar', price: 3 },
        { name: 'Bacon crocante', price: 5 },
        { name: 'Molho especial da casa', price: 2 },
        { name: 'Cebola caramelizada', price: 3 },
        { name: 'Ovo', price: 2.5 }
      ]
    }
  ],
  pizza: [
    {
      name: 'Tamanho', type: 'single', required: true,
      choices: [
        { name: 'Média — 6 fatias', price: 0 },
        { name: 'Grande — 8 fatias', price: 9 },
        { name: 'Família — 12 fatias', price: 18 }
      ]
    },
    {
      name: 'Borda recheada', type: 'single', required: false,
      choices: [
        { name: 'Sem borda', price: 0 },
        { name: 'Catupiry', price: 7 },
        { name: 'Cheddar', price: 7 }
      ]
    }
  ],
  drink: [
    {
      name: 'Tamanho', type: 'single', required: true,
      choices: [
        { name: '350 ml', price: 0 },
        { name: '600 ml', price: 4 },
        { name: '2 L', price: 8 }
      ]
    }
  ],
  simple: []
}

const restaurants = [
  {
    id: 'burger-neon',
    name: 'Burger Neon',
    category: 'Hambúrguer',
    tags: ['hambúrguer', 'burger', 'combo', 'lanches', 'sanduíche'],
    rating: 4.8, reviews: 2431,
    deliveryTime: [25, 35], deliveryFee: 0, freeShippingMin: 0,
    distance: 1.2, priceRange: '$$', open: true,
    promo: 'Combo com 20% OFF', badge: 'MAIS PEDIDO',
    logo: '🍔', cover: 'linear-gradient(135deg,#1a0a00,#3d1500 55%,#0a0a0b)',
    benefits: ['Frete grátis', 'Selo FC Premium'],
    menu: [
      {
        name: 'Mais pedidos',
        items: [
          { id: 'bn1', name: 'Neon Duplo', description: 'Dois hambúrgueres 160g, cheddar duplo, bacon e molho neon', price: 42.9, promoPrice: 34.9, emoji: '🍔', popular: true, options: 'burger' },
          { id: 'bn2', name: 'Clássico da Casa', description: 'Hambúrguer 160g, alface, tomate, queijo prato e maionese artesanal', price: 29.9, emoji: '🍔', popular: true, options: 'burger' },
          { id: 'bn3', name: 'Combo Neon', description: 'Neon Duplo + fritas cheddar bacon + refri 350ml', price: 58.9, promoPrice: 46.9, emoji: '🍟', popular: true, discount: 20, options: 'burger' },
          { id: 'bn4', name: 'Smash Trufado', description: 'Dois smash 90g, queijo suíço e maionese de trufas', price: 38.9, emoji: '🍔', options: 'burger' }
        ]
      },
      {
        name: 'Porções',
        items: [
          { id: 'bn5', name: 'Fritas Cheddar Bacon', description: 'Porção 400g com cheddar cremoso e bacon crocante', price: 26.9, emoji: '🍟', popular: true },
          { id: 'bn6', name: 'Onion Rings', description: 'Anéis de cebola empanados com molho barbecue', price: 19.9, emoji: '🧅' },
          { id: 'bn7', name: 'Nuggets Artesanais', description: '10 unidades de frango empanado com molho honey', price: 22.9, emoji: '🍗' }
        ]
      },
      {
        name: 'Bebidas',
        items: [
          { id: 'bn8', name: 'Refrigerante', description: 'Cola, guaraná ou laranja', price: 7.9, emoji: '🥤', options: 'drink' },
          { id: 'bn9', name: 'Suco Natural', description: 'Laranja, limão ou maracujá 500ml', price: 11.9, emoji: '🍹', options: 'drink' },
          { id: 'bn10', name: 'Cerveja Long Neck', description: 'Puro malte 330ml', price: 9.9, emoji: '🍺' }
        ]
      },
      {
        name: 'Sobremesas',
        items: [
          { id: 'bn11', name: 'Milkshake Ovomaltine', description: '500ml com calda e crocante', price: 21.9, emoji: '🥤', popular: true },
          { id: 'bn12', name: 'Brownie com Sorvete', description: 'Brownie quente, sorvete de creme e calda de chocolate', price: 19.9, emoji: '🍫' }
        ]
      }
    ]
  },
  {
    id: 'pizza-suprema',
    name: 'Pizza Suprema',
    category: 'Pizza',
    tags: ['pizza', 'italiana', 'massa', 'esfiha', 'calzone'],
    rating: 4.7, reviews: 1892,
    deliveryTime: [30, 45], deliveryFee: 4.99, freeShippingMin: 60,
    distance: 2.1, priceRange: '$$', open: true,
    promo: 'Leve 2 pague 1 nas terças', badge: 'FRETE GRÁTIS ACIMA DE R$ 60',
    logo: '🍕', cover: 'linear-gradient(135deg,#1f0800,#4a1600 55%,#0a0a0b)',
    benefits: ['Promoção de terça'],
    menu: [
      {
        name: 'Mais pedidas',
        items: [
          { id: 'ps1', name: 'Margherita Suprema', description: 'Molho de tomate San Marzano, muçarela de búfala e manjericão fresco', price: 44.9, emoji: '🍕', popular: true, options: 'pizza' },
          { id: 'ps2', name: 'Pepperoni Classic', description: 'Muçarela, pepperoni importado e orégano', price: 52.9, emoji: '🍕', popular: true, options: 'pizza' },
          { id: 'ps3', name: 'Quatro Queijos', description: 'Muçarela, provolone, gorgonzola e parmesão', price: 54.9, emoji: '🧀', options: 'pizza' }
        ]
      },
      {
        name: 'Especiais',
        items: [
          { id: 'ps4', name: 'Carbonara', description: 'Creme, bacon, parmesão e gema curada', price: 58.9, emoji: '🍕', popular: true, options: 'pizza' },
          { id: 'ps5', name: 'Portuguesa Premium', description: 'Presunto artesanal, cebola roxa, azeitonas e ovo caipira', price: 49.9, emoji: '🍕', options: 'pizza' },
          { id: 'ps6', name: 'Calzone Supremo', description: 'Massa recheada com muçarela, presunto e tomate', price: 46.9, emoji: '🥟', options: 'pizza' }
        ]
      },
      {
        name: 'Doces',
        items: [
          { id: 'ps7', name: 'Chocolate com Morango', description: 'Chocolate belga, morangos frescos e açúcar de confeiteiro', price: 47.9, emoji: '🍫', options: 'pizza' },
          { id: 'ps8', name: 'Romeu e Julieta', description: 'Goiabada cascão com queijo minas', price: 44.9, emoji: '🧀', options: 'pizza' }
        ]
      },
      {
        name: 'Bebidas',
        items: [
          { id: 'ps9', name: 'Refrigerante 2L', description: 'Cola ou guaraná', price: 14.9, emoji: '🥤' },
          { id: 'ps10', name: 'Vinho Tinto', description: 'Talha 750ml', price: 69.9, emoji: '🍷' }
        ]
      }
    ]
  },
  {
    id: 'sushi-zen',
    name: 'Sushi Zen',
    category: 'Japonês',
    tags: ['japonês', 'sushi', 'temaki', 'combinado', 'yakisoba', 'japonesa'],
    rating: 4.9, reviews: 1204,
    deliveryTime: [40, 55], deliveryFee: 8.99, freeShippingMin: 0,
    distance: 3.4, priceRange: '$$$', open: false, opensAt: '18:00',
    logo: '🍣', cover: 'linear-gradient(135deg,#001219,#003844 55%,#0a0a0b)',
    benefits: ['Selo FC Premium'],
    menu: [
      {
        name: 'Combinados',
        items: [
          { id: 'sz1', name: 'Zen combinado 24 peças', description: 'Seleção do chef com niguiri, sashimi, hossomaki e uramaki', price: 98.9, emoji: '🍣', popular: true },
          { id: 'sz2', name: 'Combinado 12 peças', description: 'Niguiri e hossomaki clássicos', price: 54.9, emoji: '🍣' },
          { id: 'sz3', name: 'Veggie Zen 16 peças', description: 'Combinado vegetariano com shitake e abacate', price: 62.9, emoji: '🥢' }
        ]
      },
      {
        name: 'Temakis',
        items: [
          { id: 'sz4', name: 'Temaki Salmão Grelhado', description: 'Salmão grelhado com cream cheese e cebolinha', price: 32.9, emoji: '🍚', popular: true },
          { id: 'sz5', name: 'Temaki Camarão', description: 'Camarão empanado com molho spicy', price: 34.9, emoji: '🍤' }
        ]
      },
      {
        name: 'Quentes',
        items: [
          { id: 'sz6', name: 'Yakisoba de Frango', description: 'Legumes salteados no wok com molho oriental', price: 46.9, emoji: '🍜' },
          { id: 'sz7', name: 'Ramen Tonkotsu', description: 'Caldo de porco 12h, chashu, ovo e noodles', price: 52.9, emoji: '🍜', popular: true }
        ]
      }
    ]
  },
  {
    id: 'verde-vida',
    name: 'Verde Vida',
    category: 'Saudável',
    tags: ['saudável', 'salada', 'fitness', 'vegano', 'salada', 'low carb', 'saudavel'],
    rating: 4.6, reviews: 867,
    deliveryTime: [20, 30], deliveryFee: 3.99, freeShippingMin: 45,
    distance: 0.8, priceRange: '$$', open: true,
    promo: 'Bowl + suco por R$ 29,90',
    logo: '🥗', cover: 'linear-gradient(135deg,#01150a,#0a3d1f 55%,#0a0a0b)',
    benefits: ['Opções veganas'],
    menu: [
      {
        name: 'Bowls',
        items: [
          { id: 'vv1', name: 'Bowl Proteico de Frango', description: 'Frango grelhado, arroz integral, grão de bico e legumes', price: 32.9, emoji: '🥗', popular: true },
          { id: 'vv2', name: 'Bowl Vegano', description: 'Tofu, quinoa, abacate, beterraba e sementes', price: 34.9, emoji: '🥙' },
          { id: 'vv3', name: 'Bowl Salmão', description: 'Salmão, mix de folhas, manga e molho de maracujá', price: 44.9, emoji: '🐟' }
        ]
      },
      {
        name: 'Saladas',
        items: [
          { id: 'vv4', name: 'Ceasar Fit', description: 'Alface romana, frango desfiado e molho iogurte', price: 27.9, emoji: '🥬' },
          { id: 'vv5', name: 'Salada Grega', description: 'Tomate, pepino, cebola roxa, azeitona e feta', price: 25.9, emoji: '🫒' }
        ]
      },
      {
        name: 'Sucos',
        items: [
          { id: 'vv6', name: 'Detox Verde', description: 'Couve, limão, gengibre, hortelã e maçã 500ml', price: 13.9, emoji: '🥤', popular: true },
          { id: 'vv7', name: 'Laranja com Cenoura', description: '500ml sem açúcar', price: 11.9, emoji: '🧃' }
        ]
      }
    ]
  },
  {
    id: 'frango-crispy',
    name: 'Frango Crispy',
    category: 'Frango',
    tags: ['frango', 'frito', 'chicken', 'bucket', 'alas', 'asas'],
    rating: 4.5, reviews: 1543,
    deliveryTime: [25, 40], deliveryFee: 5.99, freeShippingMin: 0,
    distance: 1.9, priceRange: '$', open: true,
    promo: 'Balde família com 15% OFF',
    logo: '🍗', cover: 'linear-gradient(135deg,#1c1200,#422800 55%,#0a0a0b)',
    menu: [
      {
        name: 'Baldes',
        items: [
          { id: 'fc1', name: 'Balde Família', description: '12 pedaços, 2 fritas e 2 refrigerantes', price: 89.9, promoPrice: 76.9, emoji: '🍗', popular: true, discount: 15 },
          { id: 'fc2', name: 'Balde Casal', description: '8 pedaços, 1 frita e 2 refrigerantes', price: 59.9, emoji: '🍗' }
        ]
      },
      {
        name: 'Peça a peça',
        items: [
          { id: 'fc3', name: 'Asas BBQ 8un', description: 'Asas crocantes com molho barbecue defumado', price: 29.9, emoji: '🍖', popular: true },
          { id: 'fc4', name: 'Tiras Crispy 10un', description: 'Tiras de frango empanadas com molho honey', price: 26.9, emoji: '🐔' },
          { id: 'fc5', name: 'Frango Frito 4 pedaços', description: 'Receita original crocante', price: 24.9, emoji: '🍗' }
        ]
      },
      {
        name: 'Acompanhamentos',
        items: [
          { id: 'fc6', name: 'Purê de Batata', description: 'Cremoso com toque de alho', price: 12.9, emoji: '🥔' },
          { id: 'fc7', name: 'Fritas Rústicas', description: 'Com páprica e alecrim', price: 14.9, emoji: '🍟' }
        ]
      }
    ]
  },
  {
    id: 'taco-loco',
    name: 'Taco Locó',
    category: 'Mexicano',
    tags: ['mexicano', 'taco', 'burrito', 'nachos', 'guacamole', 'mexicana'],
    rating: 4.4, reviews: 621,
    deliveryTime: [30, 40], deliveryFee: 6.99, freeShippingMin: 0,
    distance: 2.8, priceRange: '$$', open: true,
    logo: '🌮', cover: 'linear-gradient(135deg,#1f0500,#4d0f00 55%,#0a0a0b)',
    menu: [
      {
        name: 'Tacos',
        items: [
          { id: 'tl1', name: 'Taco Carne Asada 3un', description: 'Carne bovina grelhada, cebola, coentro e salsa verde', price: 34.9, emoji: '🌮', popular: true },
          { id: 'tl2', name: 'Taco Frango Chipotle 3un', description: 'Frango desfiado com maionese de chipotle', price: 29.9, emoji: '🌯' }
        ]
      },
      {
        name: 'Burritos e mais',
        items: [
          { id: 'tl3', name: 'Burrito Gigante', description: 'Carne, arroz mexicano, feijão preto e queijo', price: 38.9, emoji: '🌯', popular: true },
          { id: 'tl4', name: 'Nachos Supremos', description: 'Com chili, cheddar, guacamole e pico de gallo', price: 42.9, emoji: '🧀' },
          { id: 'tl5', name: 'Quesadilha', description: 'Tortilla com queijo derretido e frango', price: 31.9, emoji: '🫓' }
        ]
      },
      {
        name: 'Bebidas',
        items: [
          { id: 'tl6', name: 'Margarita sem álcool', description: 'Limão, limonada sprite e sal 500ml', price: 15.9, emoji: '🍹' },
          { id: 'tl7', name: 'Água de Jamaica', description: 'Chá de hibisco gelado 500ml', price: 12.9, emoji: '🥤' }
        ]
      }
    ]
  },
  {
    id: 'massa-vera',
    name: 'Massa Vera',
    category: 'Massas',
    tags: ['massa', 'massas', 'italiana', 'espaguete', 'lasanha', 'pizza'],
    rating: 4.7, reviews: 989,
    deliveryTime: [35, 50], deliveryFee: 4.49, freeShippingMin: 50,
    distance: 2.3, priceRange: '$$', open: true,
    logo: '🍝', cover: 'linear-gradient(135deg,#170a00,#3f2200 55%,#0a0a0b)',
    menu: [
      {
        name: 'Massas',
        items: [
          { id: 'mv1', name: 'Espaguete à Carbonara', description: 'Bacon, gema, pecorino e pimenta do reino', price: 42.9, emoji: '🍝', popular: true },
          { id: 'mv2', name: 'Fettuccine Alfredo', description: 'Manteiga, parmesão e creme fresco', price: 39.9, emoji: '🍝' },
          { id: 'mv3', name: 'Lasanha à Bolonhesa', description: 'Camadas de massa, ragu e bechamel', price: 45.9, emoji: '🍲', popular: true }
        ]
      },
      {
        name: 'Risotos',
        items: [
          { id: 'mv4', name: 'Risoto de Funghi', description: 'Arroz arbóreo, funghi porcini e parmesão', price: 52.9, emoji: '🍚' },
          { id: 'mv5', name: 'Risoto de Camarão', description: 'Camarões salteados com bisque', price: 58.9, emoji: '🍤' }
        ]
      }
    ]
  },
  {
    id: 'doce-encanto',
    name: 'Doce Encanto',
    category: 'Sobremesas',
    tags: ['sobremesa', 'sobremesas', 'doce', 'doces', 'bolo', 'torta', 'brigadeiro', 'açaí'],
    rating: 4.8, reviews: 732,
    deliveryTime: [15, 25], deliveryFee: 2.99, freeShippingMin: 30,
    distance: 0.9, priceRange: '$', open: true,
    promo: 'Leve 3 brigadeiros pague 2',
    logo: '🍰', cover: 'linear-gradient(135deg,#1d0a1a,#450f33 55%,#0a0a0b)',
    menu: [
      {
        name: 'Doces',
        items: [
          { id: 'de1', name: 'Caixa 12 Brigadeiros', description: 'Sabores clássicos e especiais', price: 39.9, promoPrice: 32.9, emoji: '🍫', popular: true, discount: 17 },
          { id: 'de2', name: 'Bolo de Copeiro', description: 'Fatia generosa com doce de leite', price: 14.9, emoji: '🍰' },
          { id: 'de3', name: 'Cheesecake de Frutas Vermelhas', description: 'Base crocante com calda artesanal', price: 19.9, emoji: '🥧', popular: true }
        ]
      },
      {
        name: 'Açaí',
        items: [
          { id: 'de4', name: 'Açaí 500ml', description: 'Até 3 acompanhamentos inclusos', price: 24.9, emoji: '🫐', popular: true },
          { id: 'de5', name: 'Açaí 300ml', description: 'Até 2 acompanhamentos inclusos', price: 17.9, emoji: '🫐' }
        ]
      }
    ]
  },
  {
    id: 'cafe-aurora',
    name: 'Café Aurora',
    category: 'Cafés',
    tags: ['café', 'cafe', 'padaria', 'café da manhã', 'pão de queijo', 'cappuccino'],
    rating: 4.6, reviews: 1105,
    deliveryTime: [10, 20], deliveryFee: 0, freeShippingMin: 0,
    distance: 0.5, priceRange: '$', open: true,
    badge: 'FRETE GRÁTIS',
    logo: '☕', cover: 'linear-gradient(135deg,#170e00,#3a2600 55%,#0a0a0b)',
    benefits: ['Frete grátis'],
    menu: [
      {
        name: 'Cafés',
        items: [
          { id: 'ca1', name: 'Cappuccino Aurora', description: 'Espresso duplo, leite vaporizado e canela', price: 12.9, emoji: '☕', popular: true },
          { id: 'ca2', name: 'Latte Gelado', description: 'Espresso, leite gelado e calda de baunilha', price: 14.9, emoji: '🧋', popular: true },
          { id: 'ca3', name: 'Espresso Duplo', description: 'Grãos de origem única', price: 8.9, emoji: '☕' }
        ]
      },
      {
        name: 'Padaria',
        items: [
          { id: 'ca4', name: 'Pão de Queijo 6un', description: 'Receita de minas assado na hora', price: 15.9, emoji: '🧆' },
          { id: 'ca5', name: 'Croissant Manteiga', description: 'Folhado francês 48h', price: 11.9, emoji: '🥐', popular: true },
          { id: 'ca6', name: 'Torta de Maçã', description: 'Fatia com canela e crumble', price: 13.9, emoji: '🥧' }
        ]
      }
    ]
  },
  {
    id: 'market-express',
    name: 'Market Express',
    category: 'Mercado',
    tags: ['mercado', 'mercado', 'conveniência', 'supermercado', 'bebidas', 'snacks'],
    rating: 4.3, reviews: 3890,
    deliveryTime: [40, 60], deliveryFee: 9.99, freeShippingMin: 120,
    distance: 4.2, priceRange: '$', open: true,
    logo: '🛒', cover: 'linear-gradient(135deg,#001318,#00303d 55%,#0a0a0b)',
    menu: [
      {
        name: 'Ofertas da semana',
        items: [
          { id: 'me1', name: 'Cesta Básica FC', description: 'Itens essenciais selecionados', price: 89.9, promoPrice: 74.9, emoji: '🧺', popular: true, discount: 17 },
          { id: 'me2', name: 'Kit Churrasco', description: 'Carne, carvão, sal e farofa', price: 129.9, promoPrice: 109.9, emoji: '🥩', discount: 15 }
        ]
      },
      {
        name: 'Bebidas',
        items: [
          { id: 'me3', name: 'Pack Refrigerante 6x2L', description: 'Sabores variados', price: 44.9, emoji: '🥤' },
          { id: 'me4', name: 'Água Mineral 12x500ml', description: 'Com ou sem gás', price: 21.9, emoji: '💧' }
        ]
      },
      {
        name: 'Snacks',
        items: [
          { id: 'me5', name: 'Kit Pipoca de Cinema', description: '3 pipocas + 2 refris + 2 chocolates', price: 49.9, emoji: '🍿', popular: true },
          { id: 'me6', name: 'Caixa de Chocolates', description: 'Bombons sortidos 400g', price: 39.9, emoji: '🍫' }
        ]
      }
    ]
  }
]

const coupons = [
  { code: 'BEMVINDO10', title: 'R$ 10 OFF', description: 'Válido no primeiro pedido, mínimo R$ 30', rules: ['Mínimo R$ 30', 'Válido por 30 dias', '1 uso por cliente'], type: 'fixed', value: 10, min: 30, tone: 'orange' },
  { code: 'FRETEGRATIS20', title: 'Frete grátis', description: 'Entrega grátis em pedidos acima de R$ 20', rules: ['Mínimo R$ 20', 'Restaurantes parceiros'], type: 'shipping', value: 0, min: 20, tone: 'dark' },
  { code: 'NEON20', title: '20% OFF até R$ 25', description: 'Em hambúrgueres selecionados', rules: ['Máx. R$ 25 de desconto', 'Hoje somente'], type: 'percent', value: 20, min: 0, max: 25, tone: 'orange' },
  { code: 'JANTA15', title: '15% OFF no jantar', description: 'Pedidos das 18h às 23h, mínimo R$ 40', rules: ['Mínimo R$ 40', '18h–23h'], type: 'percent', value: 15, min: 40, max: 20, tone: 'dark' }
]

const notifications = [
  { id: 'n1', type: 'order', title: 'Seu pedido está chegando 🚴', text: 'O entregador está a poucos minutos de você.', time: 'há 2 min', read: false },
  { id: 'n2', type: 'coupon', title: 'Você ganhou um cupom de R$ 10 🎟️', text: 'Use NEON20 no seu próximo pedido de hambúrguer.', time: 'há 1 h', read: false },
  { id: 'n3', type: 'promo', title: 'Burger Neon está com 30% OFF 🔥', text: 'Oferta relâmpago válida somente hoje.', time: 'há 3 h', read: false },
  { id: 'n4', type: 'order', title: 'Pedido entregue ✓', text: 'Avalie seu pedido do Café Aurora e ganhe pontos FC.', time: 'ontem', read: true },
  { id: 'n5', type: 'benefits', title: 'Você subiu para o nível Prata 🥈', text: 'Agora você tem 5% de cashback em todos os pedidos.', time: 'há 2 dias', read: true }
]

const user = {
  name: 'João',
  fullName: 'João Silva',
  email: 'joao.silva@email.com',
  phone: '(11) 98765-4321',
  memberSince: '2024',
  level: 'Prata',
  points: 1250,
  cashback: 5,
  avatarEmoji: '🧑‍💻'
}

const addresses = [
  { id: 'home', label: 'Casa', emoji: '🏠', street: 'Rua das Palmeiras, 123 — Apto 42', city: 'São Paulo, SP', current: true },
  { id: 'work', label: 'Trabalho', emoji: '💼', street: 'Av. Paulista, 1000 — Conj. 121', city: 'São Paulo, SP', current: false }
]

const flashDeals = [
  { id: 'fd1', emoji: '🍔', title: 'Neon Duplo por R$ 34,90', subtitle: 'Burger Neon • 20% OFF', price: 34.9, oldPrice: 42.9, restaurantId: 'burger-neon', endsInMin: 90 },
  { id: 'fd2', emoji: '🍗', title: 'Balde Família 15% OFF', subtitle: 'Frango Crispy • hoje', price: 76.9, oldPrice: 89.9, restaurantId: 'frango-crispy', endsInMin: 240 },
  { id: 'fd3', emoji: '🍫', title: 'Brigadeiros R$ 32,90', subtitle: 'Doce Encanto • caixa 12un', price: 32.9, oldPrice: 39.9, restaurantId: 'doce-encanto', endsInMin: 45 }
]

const paymentMethods = [
  { id: 'pix', name: 'Pix', description: 'Aprovação imediata', emoji: '⚡' },
  { id: 'credit', name: 'Cartão de crédito', description: 'Visa •••• 4242', emoji: '💳' },
  { id: 'meal', name: 'Cartão refeição', description: 'Alelo • Sodexo', emoji: '🎫' },
  { id: 'wallet', name: 'Carteira Food Court', description: 'Saldo R$ 24,50 + cashback', emoji: '🅵' }
]

module.exports = { categories, banners, restaurants, coupons, notifications, user, addresses, flashDeals, paymentMethods, optionGroups }

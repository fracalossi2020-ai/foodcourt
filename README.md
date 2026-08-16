# FoodCourt

Plataforma de pedidos de comida com landing page pública, autenticação e área interna do cliente.

## Executar

Requer Node.js 18 ou superior.

```bash
npm start
```

A aplicação ficará disponível em `http://localhost:3000`.

## Estrutura

```text
foodcourt/
├── src/                         # Backend Node.js
│   ├── server.js                # Servidor HTTP e rotas da API
│   ├── data/
│   │   ├── catalog.js           # Catálogo, restaurantes e produtos
│   │   └── foodcourt-db.json    # Banco local gerado em runtime
│   └── lib/
│       ├── auth.js              # Autenticação e segurança
│       ├── db.js                # Persistência local
│       ├── env.js               # Variáveis de ambiente
│       └── mailer.js            # Serviço de e-mail
├── public/                      # Frontend servido ao navegador
│   ├── index.html               # Documento principal
│   ├── assets/images/           # Imagens da aplicação
│   ├── css/
│   │   ├── base.css             # Design system e área interna
│   │   ├── auth.css             # Telas de autenticação
│   │   └── landing/             # Estilos específicos da landing
│   │       ├── hero.css
│   │       ├── sections.css
│   │       └── icons.css
│   └── js/
│       ├── app.js               # Inicialização e roteamento
│       ├── core/                # API, estado e UI compartilhada
│       └── pages/               # Módulos de cada página/rota
├── logs/                        # Logs locais do servidor
├── .env.example                 # Exemplo de configuração
└── package.json                 # Scripts e metadados
```

## Rotas principais

- `#/` — landing page pública
- `#/login` — login
- `#/cadastro` — cadastro
- `#/inicio` — página inicial autenticada
- `#/buscar` — busca
- `#/pedidos` — pedidos
- `#/perfil` — perfil

## Conta de demonstração

- E-mail: `joao@foodcourt.com`
- Senha: `foodcourt123`

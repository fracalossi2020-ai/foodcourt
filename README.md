# FoodCourt

> Consulte [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) para o mapa atualizado de pastas e convenções do projeto.

Plataforma de pedidos de comida com landing page pública, autenticação e área interna do cliente.

## Executar

Requer Node.js 18 ou superior.

```bash
npm start
```

Execute os comandos Node.js a partir da pasta `Backend` (`cd Backend`).

A aplicação ficará disponível em `http://localhost:3000`.

## Qualidade

```bash
npm test
npm run lint
npm run check
```

`npm run check` executa lint, testes de integração e verificação de formatação. O
mesmo fluxo roda automaticamente no GitHub Actions a cada push e pull request.

## Docker

```bash
docker build -t foodcourt .
docker run --rm -p 3000:3000 -v foodcourt-data:/data \
  -e SESSION_SECRET="uma-chave-longa-e-aleatoria" foodcourt
```

O contêiner roda sem privilégios, persiste os dados em `/data` e possui health
check em `GET /api/health`.

## Estrutura

```text
foodcourt/
├── Backend/                     # API e regras de negócio em Node.js
│   ├── src/                     # Servidor, bibliotecas e catálogo
│   ├── test/                    # Testes de integração
│   ├── scripts/                 # Scripts de apoio
│   ├── .env.example             # Exemplo de configuração
│   └── package.json             # Scripts e dependências
├── frontend/                    # Interface servida ao navegador
│   ├── index.html
│   ├── assets/
│   ├── css/
│   └── js/
└── banco de dados/              # Persistência JSON
    ├── runtime/                 # Banco local gerado em execução
    └── legacy/                  # Cópias antigas preservadas
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

## Login com Google e Apple

Copie as variáveis OAuth de `Backend/.env.example` para `Backend/.env` e preencha as credenciais
criadas nos consoles do Google e da Apple. Use `APP_URL` com a URL pública HTTPS
da aplicação e cadastre exatamente estas URLs de retorno:

- `APP_URL/api/auth/oauth/google/callback`
- `APP_URL/api/auth/oauth/apple/callback`

No Apple Developer, o `APPLE_CLIENT_ID` é o Services ID. A chave privada `.p8`
deve ser colocada em `APPLE_PRIVATE_KEY` usando `\n` no lugar das quebras de linha.

## Cloudflare Turnstile no login

Crie um widget Turnstile no painel da Cloudflare e configure no `Backend/.env`:

```env
TURNSTILE_SITE_KEY=sua-chave-publica
TURNSTILE_SECRET_KEY=sua-chave-secreta
TURNSTILE_HOSTNAME=seu-dominio.com.br
```

O widget é exibido e validado no servidor somente quando as duas chaves estão
preenchidas. Em desenvolvimento, deixe-as vazias para manter o Turnstile desativado.

## Publicação no Railway

Os usuários cadastrados no localhost ficam apenas no banco local e não são enviados ao GitHub. Depois do primeiro deploy, cadastre novamente as contas no endereço público.

Para impedir que contas, lojas e sessões sejam perdidas a cada deploy:

1. No projeto do Railway, anexe um **Volume** ao serviço do FoodCourt.
2. Defina o mount path como `/data`.
3. Faça um novo deploy. O servidor detecta `RAILWAY_VOLUME_MOUNT_PATH` e grava o banco em `/data/foodcourt-db.json`.

Sem um Volume, o sistema de arquivos do deploy é temporário. Não envie `banco de dados/runtime/foodcourt-db.json` ao GitHub, pois ele contém dados privados e hashes de senha.

## Portais funcionais locais

### Cliente

- URL: `http://localhost:3000/#/inicio`
- E-mail: `joao@foodcourt.com`
- Senha: `foodcourt123`

O portal do cliente inclui busca com filtros, categorias, cardápios com dados
alimentares e alergênicos, carrinho multiestabelecimento, checkout com pedidos
separados por loja, histórico persistente, rastreamento por status operacional,
cancelamento antes do preparo, avaliações verificadas, pontos e missões de
fidelidade e central de suporte.

### Dono do estabelecimento

- URL: `http://localhost:3000/#/parceiro`
- E-mail: `dono@foodcourt.com`
- Senha: `foodcourt123`

O portal inclui visão operacional, pedidos, cardápio e estoque, promoções,
financeiro, avaliações, equipe e suporte. Mudanças de status e produtos são
persistidas na base local.

### Administração FOODCOURT

- URL: `http://localhost:3000/#/admin`
- E-mail: `admin@foodcourt.com`
- Senha: `foodcourt123`

O painel consolida usuários, estabelecimentos, pedidos, volume financeiro e
ações de auditoria. As APIs verificam o papel da conta no servidor.

> Esta fase usa persistência local e pagamentos simulados. A modelagem separa
> cliente, parceiro e administrador para permitir a futura migração para
> PostgreSQL e integrações reais sem transformar o produto em uma praça física.

## Estado de produção

A aplicação já possui cookies protegidos, hash de senha com `scrypt`, limitação
de requisições, verificação de origem, headers de segurança e limite de payload.
Antes de processar pedidos reais ainda é necessário configurar SMTP, substituir
o PIX simulado por um provedor com webhooks e migrar o arquivo JSON para
PostgreSQL. Credenciais e segredos nunca devem ser enviados ao repositório.

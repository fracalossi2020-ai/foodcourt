# Estrutura do projeto FoodCourt

```text
FOODCOURT/
├── .github/workflows/           # Integração contínua
├── .vscode/                     # Organização do Explorer e busca do VS Code
├── data/
│   ├── runtime/                 # Banco JSON utilizado em desenvolvimento
│   └── legacy/                  # Cópias antigas preservadas
├── docs/                        # Documentação técnica
├── logs/                        # Saídas locais do servidor
├── public/                      # Frontend servido ao navegador
│   ├── assets/
│   │   ├── audio/               # Arquivos de áudio
│   │   └── images/
│   │       └── references/      # Referências visuais não usadas pela aplicação
│   ├── css/
│   │   ├── core/                # Reset, tokens e componentes fundamentais
│   │   ├── landing/             # Landing page pública
│   │   ├── pages/               # Estilos específicos de páginas/portais
│   │   └── themes/              # Identidade, interações e acabamento visual
│   ├── js/
│   │   ├── core/                # API, estado, carrinho e UI compartilhada
│   │   ├── data/                # Dados auxiliares do frontend
│   │   └── pages/               # Um módulo por página/rota
│   └── index.html               # Documento principal
├── src/                         # Backend Node.js
│   ├── data/                    # Catálogo e dados iniciais
│   ├── lib/                     # Autenticação, banco, e-mail e plataforma
│   └── server.js                # Servidor HTTP e rotas da API
├── test/                        # Testes de integração com Node Test Runner
├── Dockerfile                   # Imagem de produção sem privilégios
├── .env                         # Configuração local (não versionada)
├── .env.example                 # Modelo das variáveis de ambiente
├── package.json                 # Scripts e dependências
└── README.md                    # Visão geral e instruções
```

## Convenções

- Arquivos públicos utilizam nomes descritivos em `kebab-case`.
- Código compartilhado fica em `core` ou `lib`; código de rota fica em `pages`.
- Dados gerados durante a execução não ficam misturados ao código-fonte.
- Referências visuais ficam separadas dos assets usados na interface.
- Novos estilos devem entrar na pasta correspondente, evitando CSS solto na raiz.

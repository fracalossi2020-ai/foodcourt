# Publicação do FoodCourt nas lojas

Estado em 11/09/2026: existe PWA; não existem projetos nativos, AAB assinado, arquivo iOS, certificados ou submissões às lojas. Este documento é um roteiro de execução, não uma confirmação de aprovação.

## Contas do proprietário

- Apple Developer: definir pessoa física ou organização, concluir verificação e inscrição. Valor de referência: US$ 99 por ano, sujeito a moeda local. https://developer.apple.com/programs/enroll/
- Google Play Console: definir pessoa física ou organização e concluir verificação. Taxa de referência: US$ 25 uma vez. https://support.google.com/googleplay/android-developer/answer/6112435
- Não colocar senhas, certificados, keystores ou chaves privadas no GitHub. O nome legal do publicador deve corresponder à conta aprovada.
- Confirmar disponibilidade de Mac/Xcode ou ambiente macOS de compilação para iOS. O ambiente local atual é Windows, sem Android SDK detectado.

## Adaptação técnica antes de gerar versões

1. Criar projetos Android e iOS usando Capacitor com arquivos do frontend incluídos no pacote. Definir identificador definitivo com o proprietário antes de criar registros nas lojas.
2. Adaptar transporte e autenticação. Hoje `frontend/js/core/api.js` usa `/api/...`, cookies de sessão e o domínio do site. Em um pacote local essas URLs apontam ao servidor local do aplicativo. Não resolver liberando todas as origens: definir API HTTPS, transporte de sessão, validação de origem, logout e expiração explicitamente. Auditar também fetch direto, SSE, uploads, PDFs e OAuth.
3. Integrar links externos e retorno do checkout/OAuth ao aplicativo; testar cancelamento, aprovação tardia e webhook. A confirmação do pagamento continua no servidor.
4. Adaptar geolocalização e notificações ao ambiente nativo com permissões solicitadas no contexto. Web Push não equivale automaticamente a notificações APNs/FCM no aplicativo.
5. Verificar navegação voltar, teclado, áreas seguras, recuperação de conexão e funcionamento em aparelho físico. Não mostrar dados ou pagamentos fictícios como reais.
6. Implementar e validar exclusão de conta no aplicativo e recurso externo de solicitação; publicar política de privacidade que reflita os dados realmente tratados. Definir retenções necessárias com o responsável, sem prometer apagar registros que precisam ser preservados.
7. Revisar separadamente compras de comida e planos digitais dos estabelecimentos à luz das regras de cobrança das lojas. A aprovação de um fluxo não comprova a do outro.

Referências: https://capacitorjs.com/docs — https://developer.apple.com/app-store/review/guidelines/ — https://developer.apple.com/support/offering-account-deletion-in-your-app — https://support.google.com/googleplay/android-developer/answer/13327111

## Material da ficha

Rascunho a validar com os recursos habilitados na versão submetida:

- Nome: FoodCourt.
- Descrição curta: Encontre restaurantes, faça pedidos e acompanhe suas entregas.
- Descrição: Explore os estabelecimentos disponíveis, consulte seus cardápios e monte seu pedido. Acompanhe o andamento e consulte seu histórico pelo FoodCourt. A disponibilidade de lojas, entregas e formas de pagamento depende da sua região e do estabelecimento.
- Logo oficial: `frontend/assets/images/foodcourt-logo.png`. Gerar os formatos exigidos pelas lojas a partir dessa arte.
- Ainda necessários: contato de suporte, identidade do publicador, URL de privacidade, URL de exclusão de conta, classificação etária, declarações de dados, capturas reais de Android/iPhone e acesso de revisão em ambiente funcional.

## Android

Gerar e testar AAB de release, criar chave de upload guardada fora do repositório e configurar Play App Signing. Enviar primeiro ao teste interno. Quando aplicável a uma conta pessoal nova, realizar teste fechado com ao menos 12 participantes inscritos continuamente por 14 dias e solicitar acesso à produção. Não há garantia de aprovação apenas por cumprir o prazo.

Fonte: https://support.google.com/googleplay/android-developer/answer/14151465

## iPhone

Configurar equipe de assinatura e identificador no Xcode, gerar Archive e enviar ao App Store Connect. Validar pelo TestFlight, completar ficha e informações para revisão, e então enviar para análise. Uma simples embalagem do site pode não atender à regra de funcionalidade mínima; testar uma experiência adequada ao aparelho.

Fonte: https://developer.apple.com/app-store/review/guidelines/

## Critério de conclusão

Só considerar publicado após builds assinados, testes reais, formulários completos, aprovação das lojas e links públicos de distribuição. Push no GitHub ou atualização no Railway não publica automaticamente aplicativos nas lojas.

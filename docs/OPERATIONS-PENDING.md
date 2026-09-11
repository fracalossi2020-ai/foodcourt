# Operação e próximas integrações

## Diagnóstico no painel e recuperação de gravação

Administração → Sistema mostra configuração de integrações, última gravação e última cópia de backup verificada. Ter variáveis preenchidas não comprova que o provedor aceita as credenciais. Nenhum segredo é devolvido no diagnóstico.

Falhas de gravação agora interrompem novas operações da API e fazem `/api/health` responder 503. O arquivo anterior é preservado quando a escrita temporária falha. Corrija espaço/permissões, verifique o último arquivo salvo e reinicie o backend após conferir os pedidos no provedor. Não repita cobranças manualmente sem essa conferência. Isso não substitui transações SQL; gravações agendadas ainda possuem uma janela de 50 ms e operações externas exigem reconciliação.

## Mapa integrado e previsão

O acompanhamento agora oferece Mostrar rota e previsão quando `GOOGLE_ROUTES_API_KEY` e `GOOGLE_MAPS_EMBED_KEY` estão configuradas. O cliente precisa abrir o mapa; posição e endereço são enviados ao Google. A chave de Embed é pública e deve ser separada da chave privada de Routes, com restrição de API e domínio. A política CSP do backend permite o iframe do Google; uma hospedagem que aplique sua própria CSP também precisa permiti-lo.

A estimativa usa trajeto de carro com trânsito, pode divergir do veículo do entregador e não inclui paradas. A consulta usa posição recente com precisão de até 200 m, é reutilizada por até um minuto e só fica acessível ao titular de um pedido em entrega. Ao terminar ou suspender a localização, o mapa é retirado na próxima atualização. Não é gravado histórico de trajetos no banco. Testes locais usam respostas simuladas; ativação e validação reais continuam pendentes.

Referências: [Maps Embed](https://developers.google.com/maps/documentation/embed/embedding-map) e [Routes API](https://developers.google.com/maps/documentation/routes/reference/rest/v2/TopLevel/computeRoutes).

## Conferência financeira local

O financeiro considera apenas pedidos entregues com pagamento confirmado no cálculo de vendas, comissão e líquido estimado. Separa pagamentos em andamento, estornos confirmados, estornos pendentes e contestações. Pedidos entregues sem confirmação e cancelados ainda pagos aparecem para conferência. O CSV inclui essas divergências; o PDF segue o critério de vendas confirmadas. Isso não consulta extratos bancários nem executa repasses: a conciliação com o provedor e a ativação comercial continuam pendentes.

## Verificação do servidor

```sh
node Backend/scripts/health-check.js https://SEU-DOMINIO
```

Retorna código 0 quando o endpoint de saúde responde corretamente e código 1 em falha, redirecionamento ou timeout de 10 segundos. Exibe latência e tempo de atividade. É uma checagem de disponibilidade do processo, não um teste de pagamento ou de integridade do banco.

Para monitoramento contínuo, execute em um agendador externo e configure o alerta no serviço escolhido. Nenhum monitor externo foi ativado. Para backups e recuperação consulte BACKUP-RECOVERY.md.

## Informações necessárias para as integrações restantes

- Tipo de hospedagem Hostinger e banco disponível: necessários para definir a migração transacional e o procedimento de implantação, recuperação e agendamento. A produção ainda usa JSON; não execute múltiplas instâncias.
- E-mail: o projeto já possui integração SMTP/Resend. É preciso definir o remetente e a configuração no servidor antes de ativar o envio de acesso documentado em TEAM-EMAIL.md. Convites com aceite para pessoas com ou sem conta estão implementados; falta ativar e testar o envio real. Não compartilhe segredos no chat.
- Push: código implementado; exige chaves VAPID no servidor e adesão do cliente no navegador. Ativação e entrega real pendentes. Consulte PUSH-LOCATION.md.
- Frete por distância: implementado com Google Routes e tarifas configuráveis por loja. Falta configurar a chave, revisar as políticas públicas e validar os trajetos reais. Consulte DISTANCE-DELIVERY.md. Localização opcional do entregador e link para mapa foram implementados; não incluem rota ou previsão de chegada.
- Repasses e conciliação: dependem do modelo financeiro e da ativação dos pagamentos. Permanecem adiados conforme solicitado.

Essas dependências não significam que as integrações estejam prontas. A lista acima separa as ferramentas entregues das alterações ainda necessárias; a publicação na Hostinger permanece pendente.

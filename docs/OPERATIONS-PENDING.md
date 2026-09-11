# Operação e próximas integrações

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

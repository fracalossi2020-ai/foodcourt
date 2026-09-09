# Assinaturas mensais automáticas

Integração com Mercado Pago Preapproval. O parceiro abre **Planos**, aceita o valor mensal e conclui a autorização no checkout hospedado do Mercado Pago. O servidor não recebe número do cartão nem CVV. Isto não implementa Pix Automático.

## Configuração e ativação

1. Configure `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET` e `APP_URL` HTTPS no servidor (mesmas credenciais da integração de pagamentos). Consulte `PAYMENTS.md` para a URL pública usada pelo projeto.
2. No painel da aplicação Mercado Pago, configure a URL `https://SEU-DOMINIO/api/payments/mercadopago/webhook` para os eventos `subscription_preapproval` e `subscription_authorized_payment`, além dos eventos de pagamentos existentes.
3. Reinicie o backend e publique o frontend atualizado.
4. Homologue com contas/cartões de teste do Mercado Pago: autorização, cobrança aprovada/recusada, cancelamento, webhook repetido e retorno ao portal. Só habilite credenciais de produção após essa validação.

## Comportamento

- Mensalidade obtida do servidor; frequência de um mês.
- Uma mensalidade já paga por Pix posterga o início da recorrência até o vencimento atual.
- Pix pendente impede criar recorrência. Recorrência não cancelada impede gerar Pix avulso, evitando dois fluxos de cobrança concorrentes pela interface.
- Autorização não equivale a pagamento. Faturas são consultadas no provedor, e a assinatura só recebe um novo período após pagamento aprovado, em BRL e com o valor esperado.
- Webhooks usam a verificação de assinatura existente. A rotina de reconciliação também consulta periodicamente os acordos persistidos.
- Cancelar solicita o cancelamento no Mercado Pago, preservando o período já pago. Cobranças já processadas não são estornadas pelo botão de cancelamento.
- A conta `fracalossi2020@gmail.com` é vitalícia e não pode contratar recorrência.
- O projeto usa persistência JSON e bloqueios no processo: execute uma única instância de escrita. Escalar para múltiplas instâncias requer transações e bloqueios compartilhados.

## Referências

- [Criar assinatura com autorização pelo link](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/integration-configuration/subscription-no-associated-plan/pending-payments)
- [Notificações de assinaturas](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/additional-content/your-integrations/notifications/webhooks)
- [Gerenciar e cancelar](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/subscription-management)

Os testes locais usam um provedor simulado; não comprovam a habilitação comercial da conta nem uma cobrança real.

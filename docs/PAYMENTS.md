# Pagamentos do FoodCourt

As opções ficam em **Carrinho → Finalizar pedido → Pagamento** e em **Perfil → Pagamentos**.

## Integrações

| Opção | Integração | Ativação |
| --- | --- | --- |
| Pix | API de pagamentos Mercado Pago | Access token, segredo de webhook e APP_URL HTTPS |
| Crédito | Checkout Pro Mercado Pago | Mesma configuração |
| Débito | Checkout Pro Mercado Pago | Mesma configuração e `MERCADO_PAGO_DEBIT_ENABLED=1` após homologação na conta |
| Apple Pay | Stripe Checkout hospedado | Chave secreta Stripe, segredo de webhook e APP_URL HTTPS |

O Apple Pay aparece **dentro do checkout da Stripe**, conforme aparelho, navegador, cartão e conta elegíveis; a mesma página permite cartão como alternativa. Não há um formulário local que armazene número ou CVV. Débito online depende da conta, do banco e dos meios liberados no Mercado Pago; o botão permanece indisponível até habilitação explícita.

O código não ativa contas comerciais nem valida credenciais reais. Métodos sem configuração ficam desabilitados. Não publique chaves no GitHub e não envie segredos pelo chat. Configure as variáveis de `Backend/.env.example` diretamente na hospedagem.

## Configuração e homologação

1. Configure `APP_URL` com a origem HTTPS pública do FoodCourt.
2. No Mercado Pago, configure `MERCADO_PAGO_ACCESS_TOKEN` e `MERCADO_PAGO_WEBHOOK_SECRET`. Cadastre o webhook `APP_URL/api/payments/mercadopago/webhook` para notificações de pagamentos. A assinatura `x-signature` é validada e o pagamento é consultado na API.
3. Para Apple Pay, configure `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET`. Cadastre `APP_URL/api/payments/stripe/webhook` para `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded` e `charge.dispute.created`. Habilite Apple Pay nos meios de pagamento da conta.
4. Use credenciais de teste, usuários/cartões de teste dos provedores e `PAYMENTS_TEST_MODE=1`. Essa variável **não transforma uma chave de produção em chave de teste**.
5. Teste aprovação, recusa, expiração, retorno do checkout externo, cancelamento e estorno. Teste Apple Pay em um dispositivo elegível e débito com os bancos que serão aceitos. Não ative débito somente porque o botão foi implementado.
6. Após homologação, configure as credenciais e segredos de produção, use `PAYMENTS_TEST_MODE=0` e reinicie o serviço. As URLs de webhook devem continuar acessíveis pela internet.

## Regras do fluxo

- `POST /api/checkout/quote` calcula produtos, adicionais, frete por loja, prioridade e desconto no servidor. O cupom informado é aplicado somente ao primeiro estabelecimento do carrinho; a revisão mostra o resultado antes de cobrar.
- `POST /api/checkout` compara o total revisado e usa uma chave de idempotência persistida, vinculada ao usuário e ao carrinho. Todos os grupos são validados antes de reservar estoque. Uma falha do provedor permite repetir a mesma tentativa sem criar novos pedidos.
- Os pedidos começam com pagamento pendente. Somente o status verificado no provedor permite à loja aceitar/preparar o pedido. Retornar pela URL de sucesso nunca equivale a pagamento aprovado.
- `GET /api/payments/:id` consulta somente pagamentos do usuário autenticado e atualiza a tela. Os pedidos oferecem um link para retomar o pagamento.
- A consulta periódica no servidor reconcilia pagamentos e estornos pendentes, inclusive sem o cliente manter a página aberta. Reservas expiradas são liberadas após consulta ao provedor; se o provedor estiver indisponível, a consulta será repetida.
- Aprovações tardias de pedidos cancelados acionam estorno com chave estável por pedido. Um segundo pagamento aprovado de um checkout Mercado Pago já pago é devolvido.
- O Pix de assinatura de parceiro também usa o provedor e só ativa a assinatura após confirmação. É uma cobrança única; **não configura débito recorrente automático**. A aprovação da loja continua independente.
- Os endpoints antigos de Pix avulso e criação direta de pedidos retornam `410`, impedindo valores arbitrários e aprovação simulada.

O recebimento é feito na conta configurada de cada provedor. **Não há split automático entre restaurantes**, nem envio automático de Pix para entregadores. Esses repasses existentes precisam de conciliação operacional; este checkout não promete transferências que não foram integradas.

## Validação local

Execute na pasta `Backend`:

```sh
npm run check
```

Os testes usam banco temporário e respostas simuladas dos provedores, sem movimentar dinheiro. Cobrem cálculo, adulteração, estoque, isolamento de contas, idempotência, assinaturas, recusa, expiração, aprovação tardia, estornos, cartões e assinatura de parceiro. A homologação em contas reais/de teste dos provedores continua necessária antes de receber pagamentos em produção.

Referências: [Checkout Pro](https://www.mercadopago.com.br/developers/en/docs/checkout-bricks/payment-brick/advanced-features/preferences), [Stripe Checkout](https://docs.stripe.com/api/checkout/sessions/create), [Apple Pay](https://docs.stripe.com/apple-pay?platform=web), [assinaturas Stripe](https://docs.stripe.com/webhooks/signature).

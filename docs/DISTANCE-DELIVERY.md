# Frete por trajeto e navegação

## Configuração

A modalidade é opcional. Sem ativação, a loja mantém o frete fixo atual.

1. Configure uma chave de projeto com a Google Routes API habilitada em GOOGLE_ROUTES_API_KEY, apenas no backend. Restrinja a chave à API e ao servidor, defina cotas e valide os custos na conta do provedor. Nenhuma chave ou cobrança de produção foi criada nesta entrega.
2. Verifique o endereço da loja: rua, número, cidade e estado são obrigatórios. Os endereços do cliente precisam dos mesmos campos.
3. Em Minha loja → Frete por trajeto, defina taxa base, valor por quilômetro e alcance máximo. Marque a modalidade e salve. Sem chave configurada, a ativação é rejeitada.
4. Valide com endereços reais atendidos e não atendidos antes de oferecer aos clientes. Os testes do projeto usam respostas simuladas do provedor.

## Cálculo

O backend consulta o trajeto de carro pela Routes API. O frete base é `taxa base + distância em km × valor por km`, arredondado para centavos. O limite é a distância do trajeto, não um raio em linha reta. Não considera trânsito em tempo real nem representa o caminho efetivamente percorrido pelo entregador.

O cliente vê a distância e o preço na revisão, antes de pagar. Os endereços são enviados ao Google para o cálculo, conforme informado no checkout. A cotação comercial dura dez minutos, é vinculada à conta, loja, endereço e configuração de tarifas, e só pode ser validada pelo servidor. A aplicação não aceita frete informado pelo navegador. Cotações temporárias ficam em memória; reiniciar a instância exige recalcular. O valor cobrado continua registrado no pedido, mas a distância não é gravada permanentemente.

As regras de frete grátis, cupons e prioridade continuam valendo; o alcance é validado mesmo quando o frete será grátis. Retirada dispensa cotação de trajeto. Se o provedor falhar ou não encontrar rota, não há cobrança com valor presumido: o cliente pode tentar novamente ou optar por retirada, quando oferecida.

## Navegação do entregador

O pedido atual oferece Rota até a loja e Rota até o cliente. Os atalhos abrem Google Maps; o entregador confere o destino e seleciona o modo de transporte. Esses atalhos não precisam da chave da Routes API. Novos pedidos preservam cidade, estado e CEP no endereço da comanda; pedidos antigos podem ter endereço incompleto e precisam de conferência.

## Publicação

Publique frontend e backend juntos. A integração ainda precisa ser ativada e validada na Hostinger. Antes de ativá-la publicamente, ajuste as páginas de termos e privacidade da plataforma para informar o tratamento dos endereços e atender às condições do provedor. Isso não foi publicado nesta entrega.

Referências: [Compute Routes](https://developers.google.com/maps/documentation/routes/compute_route_directions), [políticas e atribuição](https://developers.google.com/maps/documentation/routes/policies), [URLs de navegação](https://developers.google.com/maps/documentation/urls/get-started).

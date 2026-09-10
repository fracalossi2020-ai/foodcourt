# Pedidos e operação — 10/09/2026

## Entregue nesta etapa

- Observações persistem no checkout e aparecem na revisão, acompanhamento e comanda.
- Editor de grupos de opções: escolha única/múltipla, obrigatoriedade e preço adicional. O servidor valida as opções e calcula o preço.
- Produtos sem estoque recebem indicação de esgotado e não podem ser abertos para compra.
- Cadastro rejeita preço inválido e estoque negativo ou fracionado.
- Programação do checkout oferece horários de Brasília em intervalos de 30 minutos. Pedidos com várias lojas usam a interseção dos horários. O servidor confirma o funcionamento no horário solicitado.
- Área de entrega por prefixos de CEP, configurável em Minha loja. Sem prefixos mantém a regra anterior, sem restrição geográfica. Não é cálculo por distância.
- Comanda com adicionais, observações e agendamento; impressão pelo navegador.
- Pedidos não finalizados permanecem em andamento mesmo após 48 horas.
- Comissão zero é respeitada. Repasse sem programação aparece como não programado, inclusive nos relatórios.
- Permissões: cozinha acessa pedidos e avança para preparando/pronto; gerente administra operação; proprietário administra equipe, financeiro e assinatura. Verificação no servidor.

## Publicação e uso

Publique backend e frontend do mesmo commit. Os arquivos da aplicação foram versionados para essa entrega.

1. Em Cardápio → Editar produto, configure os grupos de opções e salve.
2. Em Minha loja, configure os prefixos de CEP atendidos, se quiser restringir a cobertura.
3. Ative e salve a programação automática da loja para oferecer agendamentos.
4. Em Pedidos, use Ver comanda para visualizar e imprimir.
5. Colaboradores devem criar sua própria conta FoodCourt antes do vínculo. Em Equipe, edite e salve os cadastros antigos para associá-los ao ID da conta. A associação não envia e-mail nem cria uma senha para a pessoa.

## Validação

Testes automatizados cobrem observações, adicionais, estoque, cobertura de CEP, horários fechados, permissões, acesso por HTTP e revogação do colaborador. Fluxos de checkout e editor de opções foram exercitados no Chromium com dados de teste. Nenhum pagamento real foi realizado.

## Etapas ainda não implementadas

- Retirada na loja como fluxo completo, frete por distância e mapa do entregador.
- Múltiplos turnos, feriados e limite de capacidade por horário.
- Repasses bancários reais, conciliação financeira completa e política comercial de carência.
- Migração do arquivo JSON para banco transacional, backups operacionais e monitoramento de produção.
- Convites por e-mail, notificações push, pós-venda com ocorrências e melhorias de recompra.

A ativação comercial dos pagamentos permanece separada, conforme solicitado; consulte RECURRING.md quando for retomá-la.

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

## Retirada na loja

Em Minha loja, marque Retirada na loja nas modalidades de atendimento e salve. Cadastre rua e número da loja. O checkout oferece retirada para carrinhos de uma loja, sem frete ou endereço do cliente. Depois do pagamento aprovado, a loja aceita, prepara, marca como pronto e confirma a retirada. Nenhum entregador é acionado. O acompanhamento e a comanda identificam a modalidade.

## Feriados e datas de fechamento

Em Horários (ou Minha loja), use Adicionar data, informe a data e um motivo opcional e salve a programação. Essas datas bloqueiam novos pedidos imediatos e agendados, inclusive retirada, no horário de Brasília. A programação automática retoma os horários semanais depois da data; no modo manual, a reabertura continua manual. Pedidos já confirmados não são cancelados. As datas são cadastradas pela loja; não existe importação automática de feriados.

Validação desta etapa: 52 testes passaram e o editor foi exercitado no Chromium em tela de celular (adicionar, salvar, recarregar e remover).

## Turnos por dia

Em Horários ou Minha loja, use Adicionar turno para configurar até três períodos por dia (por exemplo, 11h–15h e 18h–23h). Salve a programação com a automação ativada. O status da loja e os agendamentos respeitam os intervalos. Turnos que atravessam a meia-noite são aceitos; sobreposições são rejeitadas, inclusive entre dias. Desativar um dia remove seus turnos ao salvar. Os modelos substituem os turnos adicionais do formulário. Datas de fechamento continuam tendo prioridade.

## Capacidade de agendamento

Em Horários ou Minha loja, configure o limite de pedidos agendados por intervalo de 30 minutos (0 desativa o limite). Entrega e retirada compartilham as vagas. Pedidos aguardando pagamento reservam capacidade e cancelamentos liberam a vaga. Horários lotados deixam de ser oferecidos; o servidor revalida na compra, inclusive em solicitações simultâneas. O limite não se aplica a pedidos para agora e não cancela pedidos existentes se for reduzido. A garantia atual pressupõe uma instância do backend, como a persistência JSON do projeto.

## Recompra com revisão

Pedir novamente, no histórico e na página inicial, consulta o cardápio atual e apresenta uma revisão antes de substituir o carrinho. Preços e estoque são atualizados; observações e adicionais ainda válidos são preservados. Produtos removidos, esgotados ou com opções incompatíveis são sinalizados para personalização no cardápio. Frete e horário são escolhidos novamente. A validação definitiva continua no servidor ao pagar.

## Avaliações de pedidos

O cliente escolhe explicitamente de 1 a 5 estrelas e pode escrever até 500 caracteres. Cancelar o formulário não envia avaliação. Apenas pedidos concluídos podem ser avaliados; o histórico recupera as avaliações existentes ao abrir. O servidor rejeita notas inválidas, pedidos de outra pessoa e duplicatas; os 10 pontos são creditados uma única vez.

## Respostas às avaliações

O cliente consulta sua nota, comentário e resposta da loja no histórico e nos detalhes do pedido. Respostas novas ou alteradas geram uma notificação dentro do site com acesso ao pedido; reenviar o mesmo texto não duplica o aviso. Não há envio de e-mail ou push nesta etapa.

## Publicação e uso

Publique backend e frontend do mesmo commit. Os arquivos da aplicação foram versionados para essa entrega.

1. Em Cardápio → Editar produto, configure os grupos de opções e salve.
2. Em Minha loja, configure os prefixos de CEP atendidos, se quiser restringir a cobertura.
3. Ative e salve a programação automática da loja para oferecer agendamentos.
4. Em Pedidos, use Ver comanda para visualizar e imprimir.
5. Colaboradores devem criar sua própria conta FoodCourt antes do vínculo. Em Equipe, edite e salve os cadastros antigos para associá-los ao ID da conta. A associação não envia e-mail nem cria uma senha para a pessoa.

## Validação

Testes automatizados cobrem observações, adicionais, estoque, cobertura de CEP, horários fechados, permissões, acesso por HTTP e revogação do colaborador. Fluxos de checkout e editor de opções foram exercitados no Chromium com dados de teste. Nenhum pagamento real foi realizado.

## Suporte e operação

Os detalhes do pedido oferecem Relatar problema, com o número preenchido na central de ajuda. O servidor vincula o chamado à loja do pedido e valida o titular. Ferramentas de backup/recuperação e verificação de disponibilidade estão descritas em BACKUP-RECOVERY.md e OPERATIONS-PENDING.md; não estão agendadas na produção.

## Acesso por e-mail e backup automático

Equipe oferece envio de instruções de acesso para colaboradores ativos e vinculados, mediante clique do proprietário. Consulte TEAM-EMAIL.md. A configuração do provedor e testes de entrega real continuam pendentes. O backend pode agendar backups ao definir FC_BACKUP_DIR; consulte BACKUP-RECOVERY.md. Ambas as funcionalidades foram testadas localmente, sem ativação na produção.

## Localização, push e convites

O entregador pode compartilhar a posição com o titular do pedido durante a entrega; o cliente abre a posição no mapa externo. O perfil permite ativar push quando as chaves estiverem configuradas. Equipe inclui convite por e-mail com aceite, cancelamento e expiração. Consulte PUSH-LOCATION.md e TEAM-EMAIL.md. Provedores e geolocalização foram simulados nos testes; entrega real e publicação estão pendentes.

## Etapas ainda não implementadas

- Frete por distância de trajeto e mapa com rota/previsão de chegada.
- Repasses bancários reais, conciliação financeira completa e política comercial de carência.
- Migração do arquivo JSON para banco transacional, backups operacionais e monitoramento de produção.
- Ativação e validação em produção do e-mail, push e localização.

A ativação comercial dos pagamentos permanece separada, conforme solicitado; consulte RECURRING.md quando for retomá-la.

# Checklist de prontidão para produção

## Já validado no código

- Senhas armazenadas com `scrypt`.
- Sessões com cookie `HttpOnly` e `SameSite=Lax`.
- Limite de payload e rate limit básico.
- Verificação de origem em requisições mutáveis.
- Headers de segurança e CSP configurados.
- Isolamento de dados do parceiro por `ownerId`/`storeId`.
- Contas demo separadas por papel.
- Testes automatizados de autenticação, sessão, origem e papéis.

## Obrigatório antes do primeiro deploy público

1. Definir `SESSION_SECRET` longo e aleatório no ambiente.
2. Configurar volume persistente ou migrar para PostgreSQL.
3. Trocar o pagamento PIX simulado por um PSP com webhook assinado.
4. Configurar SMTP para recuperação de senha e convites da equipe.
5. Configurar `APP_URL` e `ALLOWED_ORIGINS` com domínios reais.
6. Remover credenciais demo e dados demonstrativos do ambiente público.
7. Configurar backup, retenção e restauração do banco.
8. Adicionar monitoramento de erros, latência e falhas de pagamento.

## Contratos recomendados

### Pagamentos

- Toda cobrança deve possuir uma chave de idempotência.
- O pedido só deve ser considerado pago após webhook verificado.
- Webhooks precisam ser persistidos antes do processamento.
- Eventos repetidos devem ser ignorados com segurança.
- Estornos e expiração devem gerar eventos de auditoria.

### Banco

- Usar transações para pedido, pagamento e atualização de estoque.
- Criar índices para `storeId`, `customerId`, `status` e `createdAt`.
- Paginar listas de pedidos, avaliações, suporte e auditoria.
- Nunca depender do arquivo JSON para múltiplas instâncias.

### Equipe

- Convites devem expirar.
- Permissões devem ser verificadas no servidor, não apenas na interface.
- Alterações financeiras e de cardápio devem gerar auditoria.

## Critérios de aceite do portal do parceiro

- Um parceiro nunca visualiza pedidos de outra loja.
- Um pedido não pode retroceder de status.
- Um pedido entregue não pode ser alterado novamente.
- Produtos pausados não aparecem para novos clientes.
- Valores financeiros exibem bruto, comissão, descontos e líquido.
- O parceiro consegue concluir o onboarding sem suporte manual.
- Todas as ações críticas exibem feedback de sucesso ou erro.

# Operação e próximas integrações

## Verificação do servidor

```sh
node Backend/scripts/health-check.js https://SEU-DOMINIO
```

Retorna código 0 quando o endpoint de saúde responde corretamente e código 1 em falha, redirecionamento ou timeout de 10 segundos. Exibe latência e tempo de atividade. É uma checagem de disponibilidade do processo, não um teste de pagamento ou de integridade do banco.

Para monitoramento contínuo, execute em um agendador externo e configure o alerta no serviço escolhido. Nenhum monitor externo foi ativado. Para backups e recuperação consulte BACKUP-RECOVERY.md.

## Informações necessárias para as integrações restantes

- Tipo de hospedagem Hostinger e banco disponível: necessários para definir a migração transacional e o procedimento de implantação, recuperação e agendamento. A produção ainda usa JSON; não execute múltiplas instâncias.
- E-mail: o projeto já possui integração SMTP/Resend. É preciso definir o remetente e a configuração no servidor antes de ativar os convites. Não compartilhe segredos no chat.
- Push: exige configuração de chaves no servidor e adesão do cliente no navegador; ainda não implementado.
- Frete por distância e mapa: precisam de geocodificação dos endereços, definição do cálculo comercial e fluxo de localização consentida do entregador. Ainda não implementados.
- Repasses e conciliação: dependem do modelo financeiro e da ativação dos pagamentos. Permanecem adiados conforme solicitado.

Essas dependências não significam que as integrações estejam prontas. A lista acima separa as ferramentas entregues das alterações ainda necessárias; a publicação na Hostinger permanece pendente.

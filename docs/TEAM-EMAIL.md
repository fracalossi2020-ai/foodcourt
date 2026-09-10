# Envio de acesso à equipe

O proprietário pode usar Equipe → Enviar acesso por e-mail em um colaborador ativo com conta vinculada. A mensagem contém o endereço do login do parceiro, o nome da loja e a função. Não cria conta nem senha e não altera permissões.

Configure APP_URL com a URL HTTPS pública e MAIL_FROM com o remetente. Use a integração de e-mail já existente: RESEND_API_KEY ou SMTP_HOST, SMTP_PORT, SMTP_USER e SMTP_PASS. Defina os valores no servidor, nunca no frontend ou em commits.

Sem configuração, a API retorna indisponibilidade. Em falha de envio, a tela mostra erro e permite nova tentativa. Após o envio, há intervalo de um minuto antes de reenviar para a mesma pessoa. O envio acontece apenas ao clicar no botão; cadastrar um membro não dispara e-mail automaticamente.

Esta entrega foi validada com provedor simulado. A configuração e entrega real na Hostinger ainda precisam ser verificadas. Convites para pessoas que ainda não possuem uma conta FoodCourt não estão implementados.

# Envio de acesso à equipe

O proprietário pode usar Equipe → Enviar acesso por e-mail em um colaborador ativo com conta vinculada. A mensagem contém o endereço do login do parceiro, o nome da loja e a função. Não cria conta nem senha e não altera permissões.

Configure APP_URL com a URL HTTPS pública e MAIL_FROM com o remetente. Use a integração de e-mail já existente: RESEND_API_KEY ou SMTP_HOST, SMTP_PORT, SMTP_USER e SMTP_PASS. Defina os valores no servidor, nunca no frontend ou em commits.

Sem configuração, a API retorna indisponibilidade. Em falha de envio, a tela mostra erro e permite nova tentativa. Após o envio, há intervalo de um minuto antes de reenviar para a mesma pessoa. O envio acontece apenas ao clicar no botão; cadastrar um membro não dispara e-mail automaticamente.

## Convites com aceite

Em Equipe → Convidar por e-mail, informe nome, e-mail e função. Pode ser uma pessoa sem conta. O link expira em 48 horas, só pode ser aceito pela conta com o mesmo e-mail e só libera acesso após o aceite explícito. A pessoa pode criar sua conta e abrir novamente o link recebido. O proprietário pode cancelar convites pendentes; reenviar substitui o convite anterior quando o envio termina com sucesso. Não é possível aceitar um convite com outro vínculo ativo de loja.

Somente o hash do token fica no banco. O token de acesso viaja no link do e-mail, não aparece na lista da equipe e é invalidado após o aceite. Um erro no envio não cria um convite pendente.

Esta entrega foi validada com provedor simulado. A configuração e entrega real na Hostinger ainda precisam ser verificadas.

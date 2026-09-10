# Backup e recuperação

Execute a partir da pasta Backend, usando o caminho real configurado em FC_DB_PATH. Os comandos abaixo são exemplos: substitua os caminhos.

```sh
node scripts/backup.js create /dados/foodcourt-db.json /backups/foodcourt
node scripts/backup.js verify /backups/foodcourt/ARQUIVO.json
node scripts/backup.js restore /backups/foodcourt/ARQUIVO.json /dados/foodcourt-recuperado.json
```

O comando create lê o banco sem iniciar a aplicação, valida sua estrutura e grava uma cópia com checksum SHA-256. verify detecta corrupção acidental. restore exige um destino inexistente e nunca sobrescreve o banco ativo. O checksum não substitui controle de acesso ou criptografia.

Para recuperar: pare o backend, restaure para um arquivo novo, configure FC_DB_PATH para esse arquivo e inicie o backend. Verifique pedidos, lojas e acesso antes de retomar a operação. Preserve o arquivo anterior para investigação.

Os backups contêm dados pessoais e de autenticação. Guarde fora da pasta pública do site, com acesso restrito, e mantenha uma cópia em outro servidor ou armazenamento privado. Não envie ao GitHub.

O agendamento precisa ser ativado no servidor. Configure o agendador da hospedagem para executar create regularmente (por exemplo, a cada hora), monitorar o código de saída e copiar as cópias para armazenamento externo. A retenção e a cópia externa ainda não são automatizadas por esta ferramenta. Nenhum agendamento de produção foi criado nesta entrega.

Se o banco existente estiver ilegível, o backend agora interrompe a inicialização em vez de iniciar vazio. Use uma cópia verificada para a recuperação. A aplicação ainda usa JSON e deve operar em uma única instância até a migração transacional.

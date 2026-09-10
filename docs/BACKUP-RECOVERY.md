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

Para ativar o agendamento no próprio backend, configure FC_BACKUP_DIR com um diretório privado fora do frontend. FC_BACKUP_MINUTES define o intervalo (15 a 1440 minutos; padrão 60). O backend cria uma cópia ao iniciar e repete enquanto estiver rodando. Falhas são registradas no log. Ao atingir 168 arquivos de backup, novas cópias são pausadas com aviso no log; arquive as cópias fora do servidor e libere espaço. Não há exclusão automática. A cópia externa ainda não é automatizada. Nenhuma configuração de produção foi alterada nesta entrega.

Também é possível usar um agendador externo para executar create. Evite ativar os dois mecanismos para o mesmo diretório. A ferramenta externa create não aplica o limite de 168 cópias.

Se o banco existente estiver ilegível, o backend agora interrompe a inicialização em vez de iniciar vazio. Use uma cópia verificada para a recuperação. A aplicação ainda usa JSON e deve operar em uma única instância até a migração transacional.

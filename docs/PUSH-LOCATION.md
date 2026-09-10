# Notificações push e localização da entrega

## Push

O cliente pode ativar ou desativar os avisos em Perfil → Configurações → Notificações neste dispositivo. A permissão é solicitada somente após o clique. As mensagens exibem um aviso genérico, sem endereço, itens ou conteúdo privado do pedido. Sair da conta tenta remover a inscrição do dispositivo.

Para configurar no servidor:

1. Execute `node Backend/scripts/push-keys.js CAMINHO_PRIVADO_NOVO` para gerar as chaves em arquivo, sem imprimi-las no terminal. O destino deve ficar fora da pasta pública e não deve ser enviado ao GitHub.
2. Configure VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY e VAPID_SUBJECT (por exemplo, `mailto:suporte@seu-dominio.com.br`) no ambiente do backend. Preserve o par de chaves entre publicações.
3. Publique o backend com as dependências atualizadas (`npm ci`) e o frontend, incluindo `/push-worker.js`, sob HTTPS.
4. Ative pelo perfil em um navegador compatível e valide a entrega real de avisos antes de divulgar a funcionalidade.

Inscrições são limitadas a cinco dispositivos por conta. Destinos aceitos: FCM, Mozilla e Apple; outros serviços ainda não são suportados. Inscrições expiradas são removidas quando o serviço responde 404/410. Não há garantia de entrega ou fila persistente de reenvio; a central de notificações do site continua sendo a referência.

O service worker cuida somente dos avisos. Não adiciona cache offline nem transforma o site em aplicativo nativo. As chaves de produção e o envio real ainda não foram ativados nesta entrega.

## Localização do entregador

Durante a etapa Saiu para entrega, o entregador pode ativar Compartilhar localização no painel. O navegador solicita permissão. O compartilhamento para ao sair da tela, ao clicar em parar ou na próxima validação após o fim da entrega.

Somente o cliente titular do pedido consulta a posição. Ela fica em memória, expira após dois minutos sem atualização e não é gravada no banco ou nos backups. Reiniciar o backend remove as posições. O sistema atual pressupõe uma instância do backend.

O acompanhamento informa horário e precisão e abre a posição no OpenStreetMap em outra aba. Não calcula rota, distância cobrada ou previsão de chegada. A tela do entregador precisa ficar aberta; funcionamento em segundo plano depende do navegador. Posições do dispositivo podem ser imprecisas ou manipuladas e não devem servir como prova de entrega.

Referências de implementação: [Geolocation.watchPosition](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/watchPosition), [web-push](https://github.com/web-push-libs/web-push).

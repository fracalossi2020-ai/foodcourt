import { esc } from './ui.js';

export function operationsPanel(data) {
  if (!data) return '';
  const backup = data.backups;
  const date = value => value ? new Date(value).toLocaleString('pt-BR') : 'Ainda não registrado';
  return `<section class="partner-panel"><h2>Estado operacional</h2>
    <p>Configuração detectada não confirma funcionamento no provedor. A validação real deve ser feita antes da abertura comercial.</p>
    <div class="admin-check"><b>Gravação de dados</b><em>${data.database.status === 'ok' ? 'Sem falha detectada' : 'Falha detectada'}</em></div>
    <p>Última gravação: ${esc(date(data.database.lastSavedAt))}. Armazenamento atual: JSON; migração transacional pendente.</p>
    <div class="admin-check"><b>Backup automático</b><em>${backup.enabled ? backup.error ? 'Falha — verificar' : 'Agendado neste servidor' : 'Não configurado'}</em></div>
    <p>Última cópia verificada: ${esc(date(backup.lastSuccessAt))}</p>
    ${backup.error ? `<p role="alert">${esc(backup.error)}</p>` : ''}
    <p>Manter cópias fora do servidor e testar a recuperação continua necessário.</p>
    ${data.integrations.map(item => `<article><h3>${esc(item.name)}</h3><p><strong>${item.configured ? 'Configuração detectada; validar integração' : 'Configuração pendente'}</strong></p><p>${esc(item.next)}</p></article>`).join('')}
    <p>Chaves e senhas devem ser configuradas nas variáveis protegidas do servidor.</p>
  </section>`;
}

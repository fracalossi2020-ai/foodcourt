import { esc } from './ui.js';

export function reviewCard(review) {
  if (!review) return '';
  return `<section class="card" style="padding:16px;margin:16px 0;overflow-wrap:anywhere"><h3>Sua avaliação · ${Number(review.rating)} de 5 estrelas</h3>${review.comment ? `<p style="white-space:pre-wrap">${esc(review.comment)}</p>` : '<p>Você não adicionou um comentário.</p>'}${review.reply ? `<div style="border-top:1px solid var(--border);margin-top:12px;padding-top:12px"><b>Resposta do estabelecimento</b><p style="white-space:pre-wrap">${esc(review.reply)}</p>${review.repliedAt ? `<small>${new Date(review.repliedAt).toLocaleString('pt-BR')}</small>` : ''}</div>` : '<small>Aguardando resposta do estabelecimento.</small>'}</section>`;
}

'use strict';
const path = require('node:path');
const fs = require('node:fs');
const backups = require('./backups');
let status = { enabled: false, lastSuccessAt: null, lastAttemptAt: null, error: null };

function start(source, environment = process.env, logger = console) {
  if (!environment.FC_BACKUP_DIR) return () => {};
  const directory = path.resolve(environment.FC_BACKUP_DIR);
  const publicDirectory = path.resolve(__dirname, '../../../frontend');
  const relative = path.relative(publicDirectory, directory);
  if (!relative || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative))) throw new Error('FC_BACKUP_DIR deve ficar fora da pasta frontend.');
  const minutes = Number(environment.FC_BACKUP_MINUTES ?? 60);
  if (!Number.isInteger(minutes) || minutes < 15 || minutes > 1440) throw new Error('FC_BACKUP_MINUTES deve ficar entre 15 e 1440.');
  status = { enabled: true, intervalMinutes: minutes, lastSuccessAt: null, lastAttemptAt: null, error: null };
  function run() {
    status.lastAttemptAt = new Date().toISOString();
    try {
      if (fs.existsSync(directory) && fs.readdirSync(directory).filter(name => /^foodcourt-.*\.json$/.test(name)).length >= 168) {
        status.error = 'Limite de cópias atingido. Arquive os backups para liberar espaço.';
        logger.error('[backup] Limite de 168 cópias atingido. Arquive as cópias fora do servidor antes de liberar espaço.');
        return;
      }
      backups.create(source, directory);
      status.lastSuccessAt = new Date().toISOString();
      status.error = null;
      logger.log('[backup] Cópia criada e verificada.');
    } catch (error) { status.error = 'Falha ao criar ou verificar o backup. Consulte os registros do servidor.'; logger.error('[backup] Falha: ' + error.message); }
  }
  run();
  const timer = setInterval(run, minutes * 60000); timer.unref();
  return () => clearInterval(timer);
}
module.exports = { start, health: () => ({ ...status }) };

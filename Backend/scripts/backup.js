'use strict';
const backup = require('../src/lib/backups');
const [command, source, destination] = process.argv.slice(2);
try {
  if (command === 'create' && source && destination) console.log('Backup verificado:', backup.create(source, destination));
  else if (command === 'verify' && source) { backup.verify(source); console.log('Backup íntegro.'); }
  else if (command === 'restore' && source && destination) console.log('Cópia recuperada:', backup.restore(source, destination));
  else throw new Error('Uso: node scripts/backup.js create BANCO DIRETORIO | verify BACKUP | restore BACKUP NOVO_ARQUIVO');
} catch (error) { console.error(error.message); process.exitCode = 1; }

'use strict';
const fs = require('node:fs');
const webpush = require('web-push');
const path = require('node:path');
try {
  const destination = process.argv[2];
  if (!destination) throw new Error('Informe um arquivo privado novo fora da pasta pública para salvar as chaves.');
  const relative = path.relative(path.resolve(__dirname, '../../frontend'), path.resolve(destination));
  if (!relative || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative))) throw new Error('As chaves devem ficar fora da pasta frontend.');
  const keys = webpush.generateVAPIDKeys();
  fs.writeFileSync(destination, `VAPID_PUBLIC_KEY=${keys.publicKey}\nVAPID_PRIVATE_KEY=${keys.privateKey}\n`, { flag: 'wx', mode: 0o600 });
  console.log('Chaves gravadas no arquivo informado. Configure também VAPID_SUBJECT no servidor.');
} catch (error) { console.error(error.message); process.exitCode = 1; }

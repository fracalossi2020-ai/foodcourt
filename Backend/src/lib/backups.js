'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function validate(raw) {
  const state = JSON.parse(raw);
  for (const key of ['users', 'stores', 'platformOrders']) {
    if (!Array.isArray(state[key])) throw new Error(`Backup inválido: ${key} ausente ou inválido.`);
  }
  return raw;
}
function create(source, directory) {
  const raw = validate(fs.readFileSync(source, 'utf8'));
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const filename = path.join(directory, `foodcourt-${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomUUID()}.json`);
  const envelope = JSON.stringify({ version: 1, createdAt: new Date().toISOString(), sha256: crypto.createHash('sha256').update(raw).digest('hex'), data: raw });
  fs.writeFileSync(filename, envelope, { flag: 'wx', mode: 0o600 });
  verify(filename);
  return filename;
}
function verify(filename) {
  const backup = JSON.parse(fs.readFileSync(filename, 'utf8'));
  if (backup.version !== 1 || typeof backup.data !== 'string' || crypto.createHash('sha256').update(backup.data).digest('hex') !== backup.sha256) throw new Error('Backup corrompido ou formato desconhecido.');
  return validate(backup.data);
}
function restore(filename, destination) {
  const raw = verify(filename);
  fs.writeFileSync(destination, raw, { flag: 'wx', mode: 0o600 });
  return destination;
}
module.exports = { create, verify, restore };

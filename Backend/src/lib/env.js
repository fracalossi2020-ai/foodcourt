'use strict'
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const ENV_PATH = path.join(__dirname, '..', '..', '.env')

function loadEnv() {
  if (fs.existsSync(ENV_PATH)) {
    for (const line of fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
      if (line.trim().startsWith('#')) continue
      const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/)
      if (!m) continue
      let v = m[2].trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      if (process.env[m[1]] === undefined) process.env[m[1]] = v
    }
  }
  if (!process.env.SESSION_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET Ã© obrigatÃ³rio em produÃ§Ã£o.')
    }
    const secret = crypto.randomBytes(32).toString('hex')
    try {
      fs.appendFileSync(ENV_PATH, `\n# SESSION_SECRET gerado automaticamente em ${new Date().toISOString()}\nSESSION_SECRET=${secret}\n`, 'utf8')
    } catch (e) { console.warn('[env] não foi possível gravar .env:', e.message) }
    process.env.SESSION_SECRET = secret
    console.warn('[env] SESSION_SECRET gerado automaticamente. Defina um valor fixo em .env em produção.')
  }
}

module.exports = { loadEnv }

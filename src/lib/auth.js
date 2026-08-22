'use strict'
const crypto = require('crypto')
const db = require('./db')

const SESSION_HOURS = Math.max(1, Math.min(168, Number(process.env.SESSION_TTL_HOURS) || 2))
const SESSION_TTL = 1000 * 60 * 60 * SESSION_HOURS
const SESSION_REFRESH = 1000 * 60 * 15
const RESET_TTL = 1000 * 60 * 60
const KEYLEN = 64

/* ============ HASH DE SENHA (scrypt, nativo do Node) ============ */

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(String(password), salt, KEYLEN).toString('hex')
  return `scrypt:${salt}:${hash}`
}

function verifyPassword(password, stored) {
  try {
    const [algo, salt, hash] = String(stored).split(':')
    if (algo !== 'scrypt' || !salt || !hash) return false
    const test = crypto.scryptSync(String(password), salt, KEYLEN)
    const ref = Buffer.from(hash, 'hex')
    return test.length === ref.length && crypto.timingSafeEqual(test, ref)
  } catch {
    return false
  }
}

const DUMMY_HASH = hashPassword('fc-timing-equalizer-' + crypto.randomBytes(8).toString('hex'))
function dummyVerify() {
  verifyPassword('senha-incorreta', DUMMY_HASH)
}

/* ============ SESSÕES ============ */

const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex')

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex')
  const now = Date.now()
  db.setSession(sha256(token), {
    userId,
    createdAt: now,
    lastSeen: now,
    expiresAt: now + SESSION_TTL
  })
  return token
}

function resolveSession(token) {
  if (!token) return null
  const sess = db.getSession(sha256(token))
  if (!sess) return null
  if (Date.now() > sess.expiresAt) {
    db.deleteSession(sha256(token))
    return null
  }
  if (Date.now() - sess.lastSeen > SESSION_REFRESH) {
    sess.lastSeen = Date.now()
    sess.expiresAt = Date.now() + SESSION_TTL
    db.setSession(sha256(token), sess)
  }
  return sess
}

function destroySession(token) {
  if (token) db.deleteSession(sha256(token))
}

function revokeUserSessions(userId) {
  db.removeUserSessions(userId)
}

/* ============ TOKENS DE RECUPERAÇÃO (uso único, 1h) ============ */

function createResetToken(userId) {
  const token = crypto.randomBytes(32).toString('hex')
  db.setResetToken(sha256(token), { userId, expiresAt: Date.now() + RESET_TTL })
  return token
}

function consumeResetToken(token) {
  const rec = db.getResetToken(sha256(String(token || '')))
  if (!rec) return null
  if (Date.now() > rec.expiresAt) {
    db.deleteResetToken(sha256(token))
    return null
  }
  return rec
}

/* ============ RATE LIMIT (memória) ============ */

const buckets = new Map()
function rateLimit(key, max, windowMs) {
  const now = Date.now()
  let b = buckets.get(key)
  if (!b || now > b.resetAt) {
    b = { count: 0, resetAt: now + windowMs }
    buckets.set(key, b)
  }
  b.count++
  return { allowed: b.count <= max, retryInSec: Math.ceil((b.resetAt - now) / 1000) }
}
function clearRate(key) { buckets.delete(key) }

/* ============ VALIDAÇÃO E SANITIZAÇÃO ============ */

const sanitize = (s) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim()

function validName(v) {
  const name = sanitize(v)
  const words = name.split(/\s+/).filter(Boolean)
  if (words.length < 2) return { ok: false, error: 'Informe seu nome e sobrenome.' }
  if (words.some(w => w.length < 2)) return { ok: false, error: 'Cada parte do nome precisa ter pelo menos 2 letras.' }
  if (!/^[\p{L}\s'’-]+$/u.test(name)) return { ok: false, error: 'O nome deve conter apenas letras.' }
  return { ok: true, value: name }
}

function validEmail(v) {
  const email = sanitize(v).toLowerCase()
  if (!email) return { ok: false, error: 'Informe seu e-mail.' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, error: 'Digite um e-mail válido.' }
  return { ok: true, value: email }
}

function validPhone(v) {
  const digits = sanitize(v).replace(/\D/g, '')
  if (!digits) return { ok: false, error: 'Informe seu telefone.' }
  if (digits.length !== 10 && digits.length !== 11) return { ok: false, error: 'Digite um telefone válido com DDD.' }
  if (digits.length === 11 && digits[2] !== '9') return { ok: false, error: 'Celulares devem começar com 9 após o DDD.' }
  return { ok: true, value: digits.replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3') }
}

function validPassword(v) {
  const pw = String(v ?? '')
  if (!pw) return { ok: false, error: 'Informe sua senha.' }
  if (pw.length < 8) return { ok: false, error: 'A senha precisa ter pelo menos 8 caracteres.' }
  if (!/[a-zA-Z]/.test(pw)) return { ok: false, error: 'A senha precisa ter pelo menos uma letra.' }
  if (!/\d/.test(pw)) return { ok: false, error: 'A senha precisa ter pelo menos um número.' }
  return { ok: true, value: pw }
}

/* ============ SHAPE PÚBLICO DO USUÁRIO ============ */

function publicUser(u) {
  return {
    id: u.id,
    fullName: u.fullName,
    name: u.fullName.split(' ')[0],
    email: u.email,
    phone: u.phone,
    avatarEmoji: u.avatarEmoji,
    memberSince: u.memberSince,
    points: u.points,
    level: u.level,
    cashback: u.cashback,
    role: u.role || 'customer',
    createdAt: u.createdAt,
    lastLogin: u.lastLogin || null
  }
}

module.exports = {
  SESSION_TTL,
  hashPassword,
  verifyPassword,
  dummyVerify,
  createSession,
  resolveSession,
  destroySession,
  revokeUserSessions,
  createResetToken,
  consumeResetToken,
  rateLimit,
  clearRate,
  sanitize,
  validName,
  validEmail,
  validPhone,
  validPassword,
  publicUser
}

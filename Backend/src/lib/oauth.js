'use strict'

const crypto = require('crypto')

const b64url = (value) => Buffer.from(value).toString('base64url')
const jsonPart = (value) => b64url(JSON.stringify(value))
const nowSeconds = () => Math.floor(Date.now() / 1000)

function appOrigin(req) {
  if (process.env.APP_URL) return new URL(process.env.APP_URL).origin
  const proto = String(req.headers['x-forwarded-proto'] || (req.socket.encrypted ? 'https' : 'http')).split(',')[0].trim()
  const host = String(req.headers['x-forwarded-host'] || req.headers.host).split(',')[0].trim()
  return `${proto}://${host}`
}

function callbackUrl(provider, req) {
  return `${appOrigin(req)}/api/auth/oauth/${provider}/callback`
}

function config(provider) {
  if (provider === 'google') {
    return { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }
  }
  if (provider === 'apple') {
    return {
      clientId: process.env.APPLE_CLIENT_ID,
      teamId: process.env.APPLE_TEAM_ID,
      keyId: process.env.APPLE_KEY_ID,
      privateKey: String(process.env.APPLE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
    }
  }
  return null
}

function isConfigured(provider) {
  const c = config(provider)
  if (provider === 'google') return Boolean(c?.clientId && c?.clientSecret)
  if (provider === 'apple') return Boolean(c?.clientId && c?.teamId && c?.keyId && c?.privateKey)
  return false
}

function createState(provider, redirect) {
  const payload = jsonPart({ provider, redirect: safeRedirect(redirect), nonce: crypto.randomBytes(24).toString('base64url'), iat: Date.now() })
  const signature = crypto.createHmac('sha256', process.env.SESSION_SECRET).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

function readState(state, provider) {
  const [payload, signature] = String(state || '').split('.')
  if (!payload || !signature) throw new Error('OAUTH_STATE')
  const expected = crypto.createHmac('sha256', process.env.SESSION_SECRET).update(payload).digest()
  const actual = Buffer.from(signature, 'base64url')
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) throw new Error('OAUTH_STATE')
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  if (data.provider !== provider || Date.now() - data.iat > 10 * 60 * 1000) throw new Error('OAUTH_STATE')
  return data
}

function safeRedirect(value) {
  const path = String(value || '/inicio')
  return /^\/[a-z0-9/_?=&%-]*$/i.test(path) && !path.startsWith('//') ? path : '/inicio'
}

function authorizationUrl(provider, req, redirect) {
  const c = config(provider)
  const state = createState(provider, redirect)
  const params = new URLSearchParams({ client_id: c.clientId, redirect_uri: callbackUrl(provider, req), state })
  if (provider === 'google') {
    params.set('response_type', 'code')
    params.set('scope', 'openid email profile')
    params.set('prompt', 'select_account')
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }
  params.set('response_type', 'code')
  params.set('response_mode', 'form_post')
  params.set('scope', 'name email')
  return `https://appleid.apple.com/auth/authorize?${params}`
}

async function fetchJson(url, options) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(10000) })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error_description || body.error || 'OAUTH_PROVIDER')
  return body
}

async function googleProfile(code, req) {
  const c = config('google')
  const token = await fetchJson('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: c.clientId, client_secret: c.clientSecret, redirect_uri: callbackUrl('google', req), grant_type: 'authorization_code' })
  })
  const profile = await fetchJson('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${token.access_token}` } })
  if (!profile.email || profile.email_verified !== true) throw new Error('OAUTH_EMAIL')
  return { subject: profile.sub, email: profile.email.toLowerCase(), fullName: profile.name || profile.email.split('@')[0], picture: profile.picture }
}

function appleClientSecret() {
  const c = config('apple')
  const header = jsonPart({ alg: 'ES256', kid: c.keyId, typ: 'JWT' })
  const payload = jsonPart({ iss: c.teamId, iat: nowSeconds(), exp: nowSeconds() + 300, aud: 'https://appleid.apple.com', sub: c.clientId })
  const input = `${header}.${payload}`
  const signature = crypto.sign('sha256', Buffer.from(input), { key: c.privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url')
  return `${input}.${signature}`
}

let appleKeys = { expiresAt: 0, keys: [] }
async function verifyAppleToken(token) {
  const parts = String(token || '').split('.')
  if (parts.length !== 3) throw new Error('OAUTH_TOKEN')
  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'))
  if (Date.now() > appleKeys.expiresAt) {
    const body = await fetchJson('https://appleid.apple.com/auth/keys')
    appleKeys = { keys: body.keys || [], expiresAt: Date.now() + 60 * 60 * 1000 }
  }
  const jwk = appleKeys.keys.find(key => key.kid === header.kid)
  if (!jwk || header.alg !== 'RS256') throw new Error('OAUTH_TOKEN')
  const valid = crypto.verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), crypto.createPublicKey({ key: jwk, format: 'jwk' }), Buffer.from(parts[2], 'base64url'))
  if (!valid) throw new Error('OAUTH_TOKEN')
  const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
  if (claims.iss !== 'https://appleid.apple.com' || claims.aud !== config('apple').clientId || claims.exp < nowSeconds()) throw new Error('OAUTH_TOKEN')
  return claims
}

async function appleProfile(code, req, postedUser) {
  const c = config('apple')
  const token = await fetchJson('https://appleid.apple.com/auth/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: c.clientId, client_secret: appleClientSecret(), redirect_uri: callbackUrl('apple', req), grant_type: 'authorization_code' })
  })
  const claims = await verifyAppleToken(token.id_token)
  if (!claims.email || claims.email_verified === false || claims.email_verified === 'false') throw new Error('OAUTH_EMAIL')
  const supplied = (() => {
    try { return typeof postedUser === 'string' ? JSON.parse(postedUser) : postedUser || {} } catch { return {} }
  })()
  const name = [supplied.name?.firstName, supplied.name?.lastName].filter(Boolean).join(' ')
  return { subject: claims.sub, email: claims.email.toLowerCase(), fullName: name || claims.email.split('@')[0] }
}

module.exports = { authorizationUrl, callbackUrl, config, isConfigured, readState, safeRedirect, googleProfile, appleProfile }

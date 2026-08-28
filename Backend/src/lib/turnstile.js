'use strict'

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

function enabled() {
  return Boolean(process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY)
}

function publicConfig() {
  return { enabled: enabled(), siteKey: enabled() ? process.env.TURNSTILE_SITE_KEY : '' }
}

async function verify(token, remoteIp) {
  if (!enabled()) return { success: true, skipped: true }
  if (typeof token !== 'string' || !token || token.length > 2048) return { success: false }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const response = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: remoteIp
      }),
      signal: controller.signal
    })
    const result = await response.json()
    const expectedHostname = String(process.env.TURNSTILE_HOSTNAME || '').trim().toLowerCase()
    const validHostname = !expectedHostname || String(result.hostname || '').toLowerCase() === expectedHostname
    return { success: response.ok && result.success === true && result.action === 'login' && validHostname }
  } catch (error) {
    console.error('[turnstile] falha ao validar:', error.message)
    return { success: false }
  } finally {
    clearTimeout(timeout)
  }
}

module.exports = { enabled, publicConfig, verify }

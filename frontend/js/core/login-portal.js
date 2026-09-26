import { mountWelcomeCutout } from './welcome-cutout.js'
const pendingKey = 'fc:portal-welcome'
let active = null
export function markPortalWelcome() {
  try { sessionStorage.setItem(pendingKey, String(Date.now())) } catch { /* Storage may be disabled. */ }
}
export function clearPortalWelcome() {
  try { sessionStorage.removeItem(pendingKey) } catch { /* Optional presentation state. */ }
}
export async function showPortalWelcome() {
  let timestamp
  try { timestamp = Number(sessionStorage.getItem(pendingKey)) } catch { return }
  clearPortalWelcome()
  if (timestamp && Date.now() - timestamp < 15 * 60 * 1000) {
    const route = location.hash
    await showFilm(false)
    if (location.hash === route) await showFilm(true)
  }
}
function showFilm(welcome) {
  if (active) return active
  active = new Promise(resolve => {
    const previous = document.activeElement
    const dialog = document.createElement('dialog')
    dialog.className = `login-portal ${welcome ? 'is-welcome' : ''}`
    dialog.setAttribute('aria-label', welcome ? 'Boas-vindas ao FoodCourt' : 'Entrando no FoodCourt')
    dialog.innerHTML = `<div class="portal-ring" aria-hidden="true"></div><div class="portal-content"><p>${welcome ? 'Que bom ter você aqui!' : 'Seu próximo favorito está te esperando'}</p><video playsinline preload="auto" ${welcome ? '' : 'muted'} aria-label="${welcome ? 'Mensagem de boas-vindas' : 'Personagem convidando você a entrar'}"><source src="/assets/videos/${welcome ? 'portal-welcome' : 'portal-invite'}.mp4${welcome ? '#t=1' : ''}" type="video/mp4"></video><button class="portal-sound" type="button" hidden>Ativar som</button></div><button class="portal-skip" type="button">${welcome ? 'Continuar no início' : 'Pular animação'}</button>`
    const video = dialog.querySelector('video')
    const tunnel = dialog.querySelector('.portal-ring')
    for (let i = 0; i < 7; i++) {
      const ring = document.createElement('i')
      ring.style.setProperty('--step', i)
      tunnel.append(ring)
    }
    video.style.visibility = 'hidden'
    dialog.querySelector('.portal-sound')?.remove()
    let cleanupCutout = () => {}
    const resumeAudio = event => {
      if (!welcome || event.target.closest('.portal-skip')) return
      video.muted = false
      video.volume = 1
      video.play().catch(() => {})
    }
    let done = false
    const close = () => {
      if (done) return
      done = true
      clearTimeout(timeout)
      video.pause()
      cleanupCutout()
      dialog.close()
      dialog.remove()
      window.removeEventListener('hashchange', close)
      previous?.focus?.()
      active = null
      resolve()
    }
    const timeout = setTimeout(close, 20000)
    let frameId = 0
    const checkEnd = () => {
      if (done) return
      if (!welcome && video.currentTime >= 4) { close(); return }
      frameId = requestAnimationFrame(checkEnd)
    }
    video.addEventListener('play', () => {
      cancelAnimationFrame(frameId)
      checkEnd()
    })
    dialog.addEventListener('close', () => cancelAnimationFrame(frameId), { once:true })
    dialog.querySelector('.portal-skip').onclick = close
    dialog.addEventListener('cancel', event => { event.preventDefault(); close() })
    video.addEventListener('ended', close)
    video.addEventListener('error', close)
    video.querySelector('source').addEventListener('error', close)
    video.muted = !welcome
    video.volume = 1
    dialog.addEventListener('pointerdown', resumeAudio)
    dialog.addEventListener('keydown', resumeAudio)
    document.body.append(dialog)
    dialog.showModal()
    if (!welcome) cleanupCutout = mountWelcomeCutout(video)
    window.addEventListener('hashchange', close)
    const begin = () => video.play().catch(() => {
      if (welcome) {
        video.muted = true
        video.play().catch(() => {})
      } else close()
    })
    video.addEventListener('loadedmetadata', () => {
      video.addEventListener('seeked', () => {
        video.style.visibility = 'visible'
        begin()
      }, { once:true })
      video.currentTime = 1
    }, { once:true })
  })
  return active
}

const pendingKey = 'fc:portal-welcome'
let active = null
export function markPortalWelcome() {
  try { sessionStorage.setItem(pendingKey, String(Date.now())) } catch { /* Storage may be disabled. */ }
}
export function clearPortalWelcome() {
  try { sessionStorage.removeItem(pendingKey) } catch { /* Optional presentation state. */ }
}
export function showLoginPortal() { return showFilm(false) }
export function showPortalWelcome() {
  let timestamp
  try { timestamp = Number(sessionStorage.getItem(pendingKey)) } catch { return }
  clearPortalWelcome()
  if (timestamp && Date.now() - timestamp < 15 * 60 * 1000) void showFilm(true)
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
    const sound = dialog.querySelector('.portal-sound')
    let done = false
    const close = () => {
      if (done) return
      done = true
      clearTimeout(timeout)
      video.pause()
      dialog.close()
      dialog.remove()
      window.removeEventListener('hashchange', close)
      previous?.focus?.()
      active = null
      resolve()
    }
    const timeout = setTimeout(close, 20000)
    dialog.querySelector('.portal-skip').onclick = close
    dialog.addEventListener('cancel', event => { event.preventDefault(); close() })
    video.addEventListener('ended', close)
    video.addEventListener('error', close)
    video.querySelector('source').addEventListener('error', close)
    video.muted = !welcome
    sound.onclick = () => {
      video.muted = false
      video.play().then(() => { sound.hidden = true }).catch(() => { sound.hidden = false })
    }
    document.body.append(dialog)
    dialog.showModal()
    window.addEventListener('hashchange', close)
    const begin = () => video.play().catch(() => {
      if (welcome) {
        video.muted = true
        sound.hidden = false
        video.play().catch(() => {})
      } else close()
    })
    if (welcome) {
      video.addEventListener('loadedmetadata', () => {
        video.addEventListener('seeked', begin, { once:true })
        video.currentTime = 1
      }, { once:true })
    } else begin()
  })
  return active
}

const pendingKey = 'fc:portal-welcome'
let active = false
export function markPortalWelcome() {
  try { sessionStorage.setItem(pendingKey, String(Date.now())) } catch { /* Optional presentation. */ }
}
export function clearPortalWelcome() {
  try { sessionStorage.removeItem(pendingKey) } catch { /* Optional presentation. */ }
}
export function showPortalWelcome() {
  let timestamp
  try { timestamp = Number(sessionStorage.getItem(pendingKey)) } catch { return }
  clearPortalWelcome()
  if (active || !timestamp || Date.now() - timestamp > 15 * 60 * 1000) return
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || navigator.connection?.saveData) return
  active = true
  const previous = document.activeElement
  const dialog = document.createElement('dialog')
  dialog.className = 'login-portal'
  dialog.setAttribute('aria-label', 'Bem-vindo ao FoodCourt')
  dialog.innerHTML = '<div class="portal-stage"><div class="portal-door" aria-hidden="true"></div><video class="portal-traveler" muted playsinline preload="auto" aria-label="Personagem convidando você a entrar"><source src="/assets/videos/portal-entry-light.mp4" type="video/mp4"></video></div><p class="portal-caption">Bem-vindo ao FoodCourt</p><button class="portal-skip" type="button">Ir para o início</button>'
  const video = dialog.querySelector('video')
  video.muted = true
  let done = false, started = false, timer = 0
  let frame = 0
  const close = () => {
    if (done) return
    done = true
    clearTimeout(timer)
    clearTimeout(loadTimeout)
    cancelAnimationFrame(frame)
    video.pause()
    video.removeAttribute('src')
    video.querySelector('source')?.remove()
    video.load()
    dialog.close()
    dialog.remove()
    window.removeEventListener('hashchange', close)
    previous?.focus?.()
    active = false
  }
  const watch = () => {
    if (done) return
    if (video.currentTime >= 3) { close(); return }
    frame = requestAnimationFrame(watch)
  }
  video.addEventListener('playing', () => {
    if (started || done) return
    started = true
    clearTimeout(loadTimeout)
    dialog.classList.add('is-traveling')
    timer = setTimeout(close, 3000)
    watch()
  })
  video.addEventListener('loadeddata', () => {
    if (!done) video.play().catch(close)
  }, { once:true })
  video.addEventListener('ended', close)
  video.addEventListener('error', close)
  video.querySelector('source').addEventListener('error', close)
  dialog.querySelector('button').onclick = close
  dialog.addEventListener('cancel', event => { event.preventDefault(); close() })
  const loadTimeout = setTimeout(close, 3500)
  document.body.append(dialog)
  dialog.showModal()
  window.addEventListener('hashchange', close)
}

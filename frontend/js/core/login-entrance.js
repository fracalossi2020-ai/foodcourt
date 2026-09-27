let active

export function playLoginEntrance({ ready = Promise.resolve() } = {}) {
  if (active) return active
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return Promise.resolve()
  active = new Promise(resolve => {
    const overlay = document.createElement('div')
    overlay.className = 'login-entrance'
    overlay.setAttribute('role', 'dialog')
    overlay.setAttribute('aria-modal', 'true')
    overlay.setAttribute('aria-label', 'Bem-vindo ao FoodCourt')
    overlay.innerHTML = '<div class="login-entrance-stage" aria-hidden="true"></div><button type="button">Pular animação</button>'
    const previousFocus = document.activeElement
    const siblings = [...document.body.children]
    const inertStates = siblings.map(element => element.inert)
    siblings.forEach(element => { element.inert = true })
    document.body.append(overlay)
    const button = overlay.querySelector('button')
    button.focus()
    let finished = false, mascot, animationDone = false, pageReady = false
    const finish = () => {
      if (finished) return
      finished = true
      clearTimeout(timeout)
      clearTimeout(animationTimeout)
      mascot?.dispose()
      overlay.remove()
      siblings.forEach((element, index) => { element.inert = inertStates[index] })
      previousFocus?.focus?.()
      resolve()
    }
    const reveal = () => {
      if (animationDone && pageReady) finish()
    }
    const skip = () => { animationDone = true; reveal() }
    // Keep the filled portal covering the page until rendering completes.
    Promise.resolve(ready).then(() => { pageReady = true; reveal() }, finish)
    const animationTimeout = setTimeout(skip, 8000)
    // An unavailable backend must not trap the user in an overlay forever.
    const timeout = setTimeout(finish, 15000)
    button.onclick = skip
    overlay.onkeydown = event => {
      if (event.key === 'Escape') skip()
      if (event.key === 'Tab') { event.preventDefault(); button.focus() }
    }
    const host = overlay.querySelector('.login-entrance-stage')
    host.addEventListener('mascot:portal-complete', skip, { once: true })
    import('./mascot-three.js').then(({ mountMascot }) => {
      if (finished) return
      mascot = mountMascot(host)
      mascot.portal()
    }).catch(skip)
  }).finally(() => { active = null })
  return active
}

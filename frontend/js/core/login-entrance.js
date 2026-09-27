let active

export function playLoginEntrance() {
  if (active) return active
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return Promise.resolve()
  active = new Promise(resolve => {
    const overlay = document.createElement('div')
    overlay.className = 'login-entrance'
    overlay.setAttribute('role', 'dialog')
    overlay.setAttribute('aria-modal', 'true')
    overlay.setAttribute('aria-label', 'Bem-vindo ao FoodCourt')
    overlay.innerHTML = '<div class="login-entrance-stage" aria-hidden="true"></div><p role="status">Bem-vindo ao FoodCourt</p><button type="button">Pular animação</button>'
    const previousFocus = document.activeElement
    const siblings = [...document.body.children]
    const inertStates = siblings.map(element => element.inert)
    siblings.forEach(element => { element.inert = true })
    document.body.append(overlay)
    const host = overlay.querySelector('.login-entrance-stage')
    const button = overlay.querySelector('button')
    button.focus()
    let mascot, finished = false
    const finish = () => {
      if (finished) return
      finished = true
      clearTimeout(timeout)
      mascot?.dispose()
      overlay.remove()
      siblings.forEach((element, index) => { element.inert = inertStates[index] })
      previousFocus?.focus?.()
      resolve()
    }
    const timeout = setTimeout(finish, 12000)
    button.onclick = finish
    overlay.onkeydown = event => {
      if (event.key === 'Escape') finish()
      if (event.key === 'Tab') { event.preventDefault(); button.focus() }
    }
    host.addEventListener('mascot:portal-complete', finish, { once: true })
    import('./mascot-three.js').then(({ mountMascot }) => {
      if (finished) return
      mascot = mountMascot(host)
      mascot.portal()
    }).catch(finish)
  }).finally(() => { active = null })
  return active
}

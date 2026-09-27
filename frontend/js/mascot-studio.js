import { mountMascot } from './core/mascot-three.js'
try {
  const mascot = mountMascot(document.querySelector('#mascot'))
  let entering = false
  document.querySelector('#wave').onclick = () => mascot.wave()
  document.querySelector('#demo').onclick = () => mascot.demo()
  document.querySelector('#portal').onclick = () => {
    if (entering) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { openDashboard(); return }
    entering = true
    document.querySelectorAll('button').forEach(button => { button.disabled = true })
    document.querySelector('#status').textContent = 'Abrindo o portal…'
    mascot.portal()
  }
  document.querySelector('#mascot').addEventListener('mascot:portal-complete', () => {
    if (!entering) return
    document.querySelector('#status').textContent = 'Abrindo o início do FoodCourt…'
    openDashboard()
  })
  function openDashboard() {
    // Port 4173 serves only this static prototype, without the account API.
    const staticPreview = ['localhost', '127.0.0.1'].includes(location.hostname) && location.port === '4173'
    location.assign(staticPreview ? 'https://foodcourt.nexobg.com.br/#/inicio' : '/#/inicio')
  }
  document.querySelector('#reset').onclick = () => mascot.reset()
  document.querySelector('#status').textContent = 'Pronto. Explore o personagem em 360°.'
  window.addEventListener('pagehide', () => mascot.dispose(), { once:true })
} catch {
  document.querySelector('#status').textContent = 'Não foi possível abrir o 3D. Verifique se a aceleração gráfica está habilitada no navegador.'
  document.querySelectorAll('button').forEach(button => { button.disabled = true })
}

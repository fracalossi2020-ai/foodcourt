import { mountMascot } from './core/mascot-three.js'
try {
  const mascot = mountMascot(document.querySelector('#mascot'))
  document.querySelector('#wave').onclick = () => mascot.wave()
  document.querySelector('#reset').onclick = () => mascot.reset()
  document.querySelector('#status').textContent = 'Pronto. Explore o personagem em 360°.'
  window.addEventListener('pagehide', () => mascot.dispose(), { once:true })
} catch {
  document.querySelector('#status').textContent = 'Não foi possível abrir o 3D. Verifique se a aceleração gráfica está habilitada no navegador.'
  document.querySelectorAll('button').forEach(button => { button.disabled = true })
}

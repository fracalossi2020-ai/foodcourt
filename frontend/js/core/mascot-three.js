import * as THREE from '../vendor/three/three.module.min.js'

// Procedural prototype: no external model, video decoder or pixel segmentation.
export function mountMascot(host) {
  const renderer = new THREE.WebGLRenderer({ alpha:true, antialias:true, powerPreference:'low-power' })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.setClearColor(0x000000, 0)
  host.append(renderer.domElement)
  renderer.domElement.setAttribute('aria-label', 'Protótipo 3D do mascote FoodCourt')
  renderer.domElement.setAttribute('role', 'img')
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 50)
  camera.position.set(0, 2.6, 10)
  camera.lookAt(0, 2.3, 0)
  scene.add(new THREE.HemisphereLight(0xfff9e9, 0x667a72, 2.4))
  const key = new THREE.DirectionalLight(0xffe8cb, 3)
  key.position.set(-3, 6, 5)
  scene.add(key)
  const rim = new THREE.DirectionalLight(0xb3ffc2, 1.5)
  rim.position.set(4, 3, -3)
  scene.add(rim)
  const materials = {}
  for (const [name, color] of Object.entries({ skin:0xc88a58, black:0x202824, green:0x8edb24, hair:0x382619, white:0xfff9ec, iris:0x68452d, pupil:0x151611, mouth:0x663d30, shoe:0x111815 })) {
    materials[name] = new THREE.MeshStandardMaterial({ color, roughness:.78 })
  }
  const sphere = new THREE.SphereGeometry(1, 24, 18)
  const box = new THREE.BoxGeometry(1, 1, 1)
  const body = new THREE.Group()
  scene.add(body)
  const ellipsoid = (parent, material, position, scale) => {
    const mesh = new THREE.Mesh(sphere, materials[material])
    mesh.position.set(...position)
    mesh.scale.set(...scale)
    parent.add(mesh)
    return mesh
  }
  const block = (parent, material, position, scale, rotation = 0) => {
    const mesh = new THREE.Mesh(box, materials[material])
    mesh.position.set(...position)
    mesh.scale.set(...scale)
    mesh.rotation.z = rotation
    parent.add(mesh)
    return mesh
  }
  // Full body, with a large head and soft toy-like proportions.
  for (const x of [-.27, .27]) {
    ellipsoid(body, 'black', [x, .67, 0], [.22, .62, .23])
    ellipsoid(body, 'shoe', [x, .15, .16], [.25, .16, .4])
    block(body, 'white', [x, .06, .17], [.47, .045, .64])
  }
  ellipsoid(body, 'black', [0, 1.95, 0], [.67, .94, .39])
  ellipsoid(body, 'black', [0, 1.7, .29], [.54, .7, .16])
  block(body, 'green', [0, 1.48, .4], [1.03, .11, .065])
  for (const x of [-.4, .4]) {
    block(body, 'green', [x, 2.28, .38], [.095, .72, .055], x * -.24)
    ellipsoid(body, 'green', [x, 2.04, .46], [.065, .065, .025])
  }
  // Simple house badge, built from geometry rather than a flat character image.
  const badge = (parent, x, y, z, size) => {
    block(parent, 'green', [x - size * .23, y + size * .22, z], [size * .64, size * .1, .03], .5)
    block(parent, 'green', [x + size * .23, y + size * .22, z], [size * .64, size * .1, .03], -.5)
    block(parent, 'green', [x - size * .4, y - size * .15, z], [size * .1, size * .5, .03])
    block(parent, 'green', [x + size * .4, y - size * .15, z], [size * .1, size * .5, .03])
    block(parent, 'green', [x, y - size * .4, z], [size * .9, size * .1, .03])
    block(parent, 'white', [x - size * .12, y - size * .08, z + .02], [size * .06, size * .4, .025])
    ellipsoid(parent, 'white', [x + size * .16, y + size * .01, z + .02], [size * .1, size * .14, .025])
    block(parent, 'white', [x + size * .16, y - size * .2, z + .02], [size * .04, size * .22, .025])
  }
  badge(body, 0, 1.98, .46, .54)
  const arms = []
  for (const side of [-1, 1]) {
    const arm = new THREE.Group()
    arm.position.set(side * .58, 2.46, 0)
    arm.rotation.z = side * .17
    body.add(arm)
    ellipsoid(arm, 'black', [side * .09, -.2, 0], [.25, .35, .28])
    ellipsoid(arm, 'skin', [side * .13, -.66, .015], [.17, .4, .18])
    ellipsoid(arm, 'skin', [side * .13, -.98, .07], [.19, .22, .14])
    ellipsoid(arm, 'skin', [side * -.01, -.93, .18], [.085, .14, .085])
    arms.push(arm)
  }
  ellipsoid(body, 'skin', [0, 2.92, 0], [.25, .3, .25])
  const head = new THREE.Group()
  head.position.set(0, 3.62, 0)
  body.add(head)
  ellipsoid(head, 'skin', [0, 0, 0], [.77, .83, .64])
  for (const x of [-.77, .77]) {
    ellipsoid(head, 'skin', [x, -.04, 0], [.16, .24, .14])
  }
  const eyelids = []
  for (const x of [-.29, .29]) {
    const eye = new THREE.Group()
    eye.position.set(x, .13, .553)
    head.add(eye)
    ellipsoid(eye, 'white', [0, 0, 0], [.205, .245, .11])
    ellipsoid(eye, 'iris', [0, -.005, .087], [.117, .15, .047])
    ellipsoid(eye, 'pupil', [0, -.005, .125], [.063, .093, .018])
    ellipsoid(eye, 'white', [-.031, .057, .14], [.029, .038, .009])
    eyelids.push(eye)
    const brow = ellipsoid(head, 'hair', [x, .44, .55], [.23, .056, .055])
    brow.rotation.z = x * -.32
  }
  ellipsoid(head, 'skin', [0, -.1, .66], [.145, .16, .17])
  const smileCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-.3, -.34, .57), new THREE.Vector3(0, -.46, .62), new THREE.Vector3(.3, -.34, .57),
  ])
  const smileGeometry = new THREE.TubeGeometry(smileCurve, 20, .025, 6, false)
  head.add(new THREE.Mesh(smileGeometry, materials.mouth))
  for (let i = 0; i < 9; i++) {
    const x = (i - 4) * .155
    const lock = ellipsoid(head, 'hair', [x, .58 - Math.abs(x) * .2, .42], [.22, .22, .23])
    lock.rotation.z = -.5
  }
  ellipsoid(head, 'black', [0, .66, -.04], [.81, .43, .65])
  ellipsoid(head, 'green', [0, .55, .56], [.82, .075, .56])
  ellipsoid(head, 'black', [0, .58, .56], [.82, .06, .56])
  badge(head, 0, .8, .55, .38)

  let visible = true, disposed = false, dragging = false, lastX = 0, yaw = -.12
  let wavingUntil = 0, lastFrame = 0, frame = 0
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const resize = () => {
    const { width, height } = host.getBoundingClientRect()
    if (!width || !height) return
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }
  const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting })
  observer.observe(host)
  const resizer = new ResizeObserver(resize)
  resizer.observe(host)
  const down = event => { dragging = true; lastX = event.clientX; renderer.domElement.setPointerCapture(event.pointerId) }
  const move = event => { if (dragging) { yaw += (event.clientX - lastX) * .009; lastX = event.clientX } }
  const up = () => { dragging = false }
  renderer.domElement.addEventListener('pointerdown', down)
  renderer.domElement.addEventListener('pointermove', move)
  renderer.domElement.addEventListener('pointerup', up)
  renderer.domElement.addEventListener('pointercancel', up)
  const render = now => {
    if (disposed) return
    frame = requestAnimationFrame(render)
    if (!visible || document.hidden || now - lastFrame < 32) return
    lastFrame = now
    const t = now / 1000
    body.rotation.y = yaw
    body.position.y = reduced.matches ? 0 : Math.sin(t * 1.5) * .025
    head.rotation.z = reduced.matches ? 0 : Math.sin(t * .8) * .025
    arms[1].rotation.z = !reduced.matches && now < wavingUntil ? 2.25 + Math.sin(t * 10) * .2 : .17
    const blink = !reduced.matches && t % 4.5 < .13
    eyelids.forEach(eye => { eye.scale.y = blink ? .1 : 1 })
    renderer.render(scene, camera)
  }
  resize()
  frame = requestAnimationFrame(render)
  return {
    wave() { wavingUntil = performance.now() + 2200 },
    reset() { yaw = -.12 },
    dispose() {
      disposed = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      resizer.disconnect()
      sphere.dispose(); box.dispose(); smileGeometry.dispose()
      Object.values(materials).forEach(material => material.dispose())
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}

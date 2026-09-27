import * as THREE from '../vendor/three/three.module.min.js'

// Procedural prototype: no external model, video decoder or pixel segmentation.
export function mountMascot(host) {
  const renderer = new THREE.WebGLRenderer({ alpha:true, antialias:true, powerPreference:'low-power' })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.1
  renderer.setClearColor(0x000000, 0)
  renderer.localClippingEnabled = true
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
  materials.skin.roughness = .56
  materials.hair.roughness = .66
  materials.iris.roughness = .24
  materials.pupil.roughness = .18
  materials.black.roughness = .94
  const box = new THREE.BoxGeometry(1, 1, 1)
  const body = new THREE.Group()
  const customGeometries = []
  scene.add(body)
  const block = (parent, material, position, scale, rotation = 0) => {
    const mesh = new THREE.Mesh(box, materials[material])
    mesh.position.set(...position)
    mesh.scale.set(...scale)
    mesh.rotation.z = rotation
    parent.add(mesh)
    return mesh
  }
  // Voxel-inspired proportions: flat garment surfaces and articulated blocks.
  const legs = [], knees = [], feet = [], arms = [], eyelids = []
  for (const x of [-.24, .24]) {
    const leg = new THREE.Group()
    leg.position.set(x, 1.38, 0)
    body.add(leg)
    block(leg, 'black', [0, -.3, 0], [.36, .62, .38])
    const knee = new THREE.Group()
    knee.position.y = -.59
    leg.add(knee)
    block(knee, 'black', [0, -.29, 0], [.34, .59, .36])
    const foot = new THREE.Group()
    foot.position.y = -.58
    knee.add(foot)
    block(foot, 'shoe', [0, -.055, .09], [.38, .19, .55])
    block(foot, 'white', [0, -.14, .09], [.39, .055, .56])
    for (let i = 0; i < 3; i++) block(foot, 'green', [0, .044, .13 + i * .065], [.19, .012, .025])
    legs.push(leg); knees.push(knee); feet.push(foot)
  }
  block(body, 'black', [0, 2.02, 0], [.92, 1.32, .5])
  block(body, 'shoe', [0, 1.84, .265], [.74, .96, .035])
  block(body, 'green', [0, 1.59, .294], [.92, .085, .025])
  block(body, 'green', [0, 1.59, -.26], [.92, .085, .025])
  for (const x of [-.325, .325]) {
    block(body, 'green', [x, 2.33, .269], [.072, .72, .025])
    block(body, 'green', [x, 2.69, 0], [.072, .025, .54])
    block(body, 'green', [x, 2.34, -.268], [.072, .7, .025])
    block(body, 'white', [x, 2.03, .29], [.08, .07, .025])
  }
  // Collar, button placket and stitched pocket are flush with the shirt.
  block(body, 'shoe', [-.16, 2.57, .276], [.25, .16, .022], -.22)
  block(body, 'shoe', [.16, 2.57, .276], [.25, .16, .022], .22)
  for (const y of [2.43, 2.33]) block(body, 'white', [0, y, .285], [.027, .027, .015])
  block(body, 'black', [0, 1.77, .294], [.35, .19, .025])
  block(body, 'green', [0, 1.865, .31], [.35, .015, .012])
  const badge = (parent, y, z, scale) => {
    block(parent, 'green', [-scale * .22, y + scale * .22, z], [scale * .57, scale * .09, .02], .52)
    block(parent, 'green', [scale * .22, y + scale * .22, z], [scale * .57, scale * .09, .02], -.52)
    for (const x of [-.37, .37]) block(parent, 'green', [x * scale, y - scale * .12, z], [scale * .09, scale * .43, .02])
    block(parent, 'green', [0, y - scale * .33, z], [scale * .82, scale * .09, .02])
    for (const x of [-.13, .13]) block(parent, 'white', [x * scale, y - scale * .09, z + .012], [scale * .05, scale * .36, .02])
    block(parent, 'white', [.13 * scale, y + scale * .07, z + .012], [scale * .14, scale * .16, .02])
    for (const x of [-.2, -.13, -.06]) block(parent, 'white', [x * scale, y + scale * .09, z + .012], [scale * .035, scale * .13, .02])
  }
  badge(body, 2.12, .305, .42)
  for (const side of [-1, 1]) {
    const arm = new THREE.Group()
    arm.position.set(side * .59, 2.55, 0)
    arm.rotation.z = side * .08
    body.add(arm)
    block(arm, 'black', [0, -.17, 0], [.3, .45, .44])
    block(arm, 'green', [0, -.385, 0], [.305, .025, .445])
    block(arm, 'skin', [0, -.62, 0], [.245, .46, .31])
    block(arm, 'skin', [0, -.92, .025], [.265, .2, .335])
    block(arm, 'skin', [-side * .155, -.89, .08], [.065, .14, .15])
    arms.push(arm)
  }
  block(body, 'skin', [0, 2.81, 0], [.3, .26, .3])
  const head = new THREE.Group()
  head.position.set(0, 3.45, 0)
  body.add(head)
  block(head, 'skin', [0, 0, 0], [1.15, 1.15, .94])
  for (const side of [-1, 1]) {
    block(head, 'skin', [side * .61, -.04, 0], [.1, .22, .22])
    block(head, 'hair', [side * .565, .28, 0], [.04, .4, .94])
  }
  for (const x of [-.26, .26]) {
    const eye = new THREE.Group()
    eye.position.set(x, .04, .481)
    head.add(eye)
    block(eye, 'white', [0, 0, 0], [.25, .19, .018])
    block(eye, 'iris', [-Math.sign(x) * .025, -.01, .013], [.115, .165, .016])
    block(eye, 'pupil', [-Math.sign(x) * .025, -.012, .023], [.055, .105, .01])
    block(eye, 'white', [-.034, .042, .032], [.035, .035, .009])
    eyelids.push(eye)
    block(head, 'hair', [x, .24, .483], [.27, .045, .024], -Math.sign(x) * .08)
  }
  block(head, 'skin', [0, -.12, .506], [.13, .13, .1])
  block(head, 'mouth', [0, -.32, .482], [.32, .085, .018])
  block(head, 'mouth', [-.18, -.285, .482], [.055, .055, .018])
  block(head, 'mouth', [.18, -.285, .482], [.055, .055, .018])
  block(head, 'white', [0, -.294, .494], [.28, .03, .012])
  block(head, 'hair', [0, .445, 0], [1.18, .27, .96])
  for (let i = 0; i < 6; i++) {
    block(head, 'hair', [-.475 + i * .19, .34 - (i % 3) * .035, .488], [.185, .15, .045])
  }
  block(head, 'black', [0, .66, -.035], [1.23, .24, 1.02])
  block(head, 'black', [0, .51, .37], [1.3, .075, .85])
  block(head, 'green', [0, .467, .37], [1.3, .023, .85])
  badge(head, .67, .49, .25)

  const portal = new THREE.Group()
  portal.position.set(1.35, 2.3, -1.25)
  scene.add(portal)
  const ringGeometry = new THREE.TorusGeometry(1.6, .08, 12, 80)
  const doorGeometry = new THREE.CircleGeometry(1.6, 64)
  customGeometries.push(ringGeometry, doorGeometry)
  const ringMaterial = new THREE.MeshBasicMaterial({ color:0x83ff77 })
  const doorMaterial = new THREE.MeshBasicMaterial({ color:0x12394a, side:THREE.DoubleSide })
  const ring = new THREE.Mesh(ringGeometry, ringMaterial)
  ring.scale.y = 1.62
  portal.add(ring)
  const door = new THREE.Mesh(doorGeometry, doorMaterial)
  door.scale.y = 1.62
  door.position.z = -.08
  portal.add(door)
  const innerRing = new THREE.Mesh(ringGeometry, ringMaterial)
  innerRing.scale.set(.94, 1.52, 1)
  innerRing.position.z = -.02
  portal.add(innerRing)
  portal.visible = false
  const portalPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 1.25)
  let portalStart = -1, portalElapsed = 0, portalYaw = 0, walkDistance = 0
  const smooth = value => {
    const p = Math.min(1, Math.max(0, value))
    return p * p * (3 - 2 * p)
  }
  const resetPortal = () => {
    portalStart = -1
    portal.visible = false
    body.visible = true
    body.position.set(0, 0, 0)
    body.rotation.z = 0
    head.rotation.y = 0
    portalElapsed = 0
    walkDistance = 0
    portal.scale.setScalar(1)
    legs.forEach(leg => { leg.rotation.x = 0 })
    knees.forEach(knee => { knee.rotation.x = 0 })
    feet.forEach(foot => { foot.rotation.x = 0 })
    arms.forEach(arm => { arm.rotation.x = 0 })
    Object.values(materials).forEach(material => { material.clippingPlanes = null })
    camera.position.set(0, 2.6, 10)
    camera.lookAt(0, 2.3, 0)
  }
  let visible = true, disposed = false, dragging = false, lastX = 0, yaw = -.12
  let wavingUntil = 0, lastFrame = 0, frame = 0
  let demoStart = -1
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
  const down = event => { if (portalStart >= 0) return; dragging = true; lastX = event.clientX; renderer.domElement.setPointerCapture(event.pointerId) }
  const move = event => { if (dragging) { yaw += (event.clientX - lastX) * .009; lastX = event.clientX } }
  const up = () => { dragging = false }
  renderer.domElement.addEventListener('pointerdown', down)
  renderer.domElement.addEventListener('pointermove', move)
  renderer.domElement.addEventListener('pointerup', up)
  renderer.domElement.addEventListener('pointercancel', up)
  const render = now => {
    if (disposed) return
    frame = requestAnimationFrame(render)
    if (!visible || document.hidden) { lastFrame = now; return }
    if (now - lastFrame < 32) return
    const delta = Math.min((now - lastFrame) / 1000, .1)
    lastFrame = now
    const t = now / 1000
    body.rotation.y = yaw
    body.position.y = reduced.matches ? 0 : Math.sin(t * 1.5) * .025
    if (portalStart >= 0) {
      portalElapsed += delta * 1.5
      const elapsed = portalElapsed
      const progress = smooth((elapsed - 1.3) / 3.3)
      portal.visible = true
      const flyThrough = smooth((elapsed - 4.35) / 1.45)
      camera.position.set(1.35 * flyThrough, 2.6 - .3 * flyThrough, 10 - 9.4 * flyThrough)
      camera.lookAt(1.35 * flyThrough, 2.3, -1.25)
      // Grow the aperture and move into it; never close it behind the character.
      portal.scale.setScalar(Math.max(.001, smooth(elapsed / .85)) * (1 + flyThrough * Math.max(3, camera.aspect * 2)))
      // Approach the center first, then cross straight through. A diagonal
      // continuation used to leave the head/arm outside the oval after clipping.
      const align = smooth(progress / .42)
      const depth = smooth((progress - .32) / .68)
      const heading = Math.PI / 2 + Math.PI / 2 * smooth(progress / .42)
      const turn = Math.atan2(Math.sin(heading - portalYaw), Math.cos(heading - portalYaw))
      body.rotation.y = portalYaw + turn * smooth((elapsed - .35) / 1.1)
      head.rotation.y = Math.sin(smooth(elapsed / 1.45) * Math.PI) * .18
      // The walking path crosses the actual center of the portal plane.
      const nextX = align * 1.35, nextZ = -depth * 2.9
      const distance = Math.hypot(nextX - body.position.x, nextZ - body.position.z)
      walkDistance += distance
      body.position.x = nextX
      body.position.z = nextZ
      // Cadence follows distance traveled, rather than advancing while standing.
      const gait = walkDistance / .82 * Math.PI
      const envelope = Math.min(1, progress * 12, (1 - progress) * 12, distance / Math.max(delta, .001) / .65)
      body.position.y = -.02 * envelope + Math.abs(Math.sin(gait)) * .025 * envelope
      body.rotation.z = Math.sin(gait) * .025 * envelope
      const stride = Math.sin(gait) * .32 * envelope
      legs.forEach((leg, index) => {
        const phase = gait + index * Math.PI
        const swing = Math.max(0, Math.sin(phase))
        leg.rotation.x = -Math.sin(phase) * .32 * envelope
        knees[index].rotation.x = swing * .62 * envelope
        // Counter-rotate at the ankle; lift the toe only on the swinging leg.
        feet[index].rotation.x = -leg.rotation.x - knees[index].rotation.x + swing * .12 * envelope
      })
      arms[0].rotation.x = stride * .65
      arms[1].rotation.x = -stride * .65
      innerRing.rotation.z = Math.sin(elapsed * 1.2) * .025
      // Let clipping hide the body progressively as it crosses the surface.
      if (elapsed > 4.7) {
        body.visible = false
      }
      if (elapsed > 5.8) {
        portalStart = -1
        host.dispatchEvent(new CustomEvent('mascot:portal-complete'))
      }
    }
    head.rotation.z = reduced.matches ? 0 : Math.sin(t * .8) * .025
    arms[1].rotation.z = !reduced.matches && now < wavingUntil ? 2.25 + Math.sin(t * 10) * .2 : .17
    if (demoStart >= 0 && !reduced.matches) {
      const elapsed = (now - demoStart) / 1000
      // One-shot greeting, turn and small celebratory hop; ends at the original pose.
      if (elapsed < 1.8) {
        const envelope = Math.min(1, elapsed * 4, (1.8 - elapsed) * 4)
        arms[1].rotation.z = .17 + envelope * (2.05 + Math.sin(elapsed * 11) * .18)
      } else if (elapsed < 3.8) {
        const progress = (elapsed - 1.8) / 2
        body.rotation.y = yaw + Math.PI * 2 * (progress * progress * (3 - 2 * progress))
      } else if (elapsed < 4.6) {
        body.position.y = Math.sin((elapsed - 3.8) / .8 * Math.PI) * .3
      } else demoStart = -1
    }
    const blink = !reduced.matches && t % 4.5 < .13
    eyelids.forEach(eye => { eye.scale.y = blink ? .1 : 1 })
    renderer.render(scene, camera)
  }
  resize()
  frame = requestAnimationFrame(render)
  return {
    wave() { resetPortal(); wavingUntil = performance.now() + 2200 },
    demo() { resetPortal(); demoStart = performance.now() },
    portal() {
      resetPortal()
      demoStart = -1
      wavingUntil = 0
      if (reduced.matches) return
      portalStart = performance.now()
      portalYaw = yaw
      dragging = false
      Object.values(materials).forEach(material => { material.clippingPlanes = [portalPlane] })
    },
    reset() { resetPortal(); yaw = -.12; demoStart = -1; wavingUntil = 0 },
    dispose() {
      if (disposed) return
      disposed = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      resizer.disconnect()
      box.dispose()
      customGeometries.forEach(geometry => geometry.dispose())
      Object.values(materials).forEach(material => material.dispose())
      ringMaterial.dispose(); doorMaterial.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}

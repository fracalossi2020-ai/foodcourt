'use strict'

const fs = require('fs')

const port = process.argv[2] || '9223'
const width = Number(process.argv[3] || 390)
const route = process.argv[4] || '/'
const output = process.argv[5] || `logs/mobile-${width}.png`

async function run() {
  const pages = await fetch(`http://127.0.0.1:${port}/json`).then(response => response.json())
  const page = pages.find(item => item.type === 'page')
  if (!page) throw new Error('Nenhuma página disponível para auditoria.')
  const socket = new WebSocket(page.webSocketDebuggerUrl)
  let id = 0
  const pending = new Map()
  socket.onmessage = event => {
    const message = JSON.parse(event.data)
    if (!message.id || !pending.has(message.id)) return
    const { resolve, reject } = pending.get(message.id)
    pending.delete(message.id)
    if (message.error) reject(new Error(message.error.message))
    else resolve(message.result)
  }
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject })
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const requestId = ++id
    pending.set(requestId, { resolve, reject })
    socket.send(JSON.stringify({ id:requestId, method, params }))
  })
  await call('Page.enable')
  await call('Runtime.enable')
  await call('Emulation.setDeviceMetricsOverride', { width, height:844, deviceScaleFactor:1, mobile:true, screenWidth:width, screenHeight:844 })
  await call('Emulation.setTouchEmulationEnabled', { enabled:true, maxTouchPoints:5 })
  if (route !== '/') {
    await call('Page.navigate', { url:'http://127.0.0.1:3000/' })
    await new Promise(resolve => setTimeout(resolve, 1200))
    await call('Runtime.evaluate', { awaitPromise:true, returnByValue:true, expression:`fetch('/api/auth/login', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      credentials:'include',
      body:JSON.stringify({ email:'joao@foodcourt.com', password:'foodcourt123' })
    }).then(response => response.json())` })
  }
  await call('Page.navigate', { url:`http://127.0.0.1:3000/?mobileAudit=${Date.now()}#${route}` })
  await new Promise(resolve => setTimeout(resolve, 5000))
  const audit = await call('Runtime.evaluate', { returnByValue:true, expression:`(() => {
    const viewport = document.documentElement.clientWidth
    const overflowing = [...document.querySelectorAll('body *')].map(element => {
      const rect = element.getBoundingClientRect()
      return { tag:element.tagName.toLowerCase(), cls:String(element.className || '').slice(0,120), left:Math.round(rect.left), right:Math.round(rect.right), width:Math.round(rect.width) }
    }).filter(item => item.right > viewport + 1 || item.left < -1).sort((a,b) => b.right-a.right).slice(0,25)
    return { viewport, bodyWidth:document.body.scrollWidth, documentWidth:document.documentElement.scrollWidth, hash:location.hash, overflowing }
  })()` })
  const screenshot = await call('Page.captureScreenshot', { format:'png', captureBeyondViewport:false, fromSurface:true })
  fs.writeFileSync(output, Buffer.from(screenshot.data, 'base64'))
  console.log(JSON.stringify(audit.result.value, null, 2))
  socket.close()
}

run().catch(error => { console.error(error); process.exitCode = 1 })

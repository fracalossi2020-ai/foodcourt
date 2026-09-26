// Remove only neutral background connected to the frame edges, not eyes or logos.
export function mountWelcomeCutout(video) {
  const canvas = document.createElement('canvas')
  canvas.width = 288
  canvas.height = 512
  canvas.className = 'welcome-cutout'
  canvas.setAttribute('aria-hidden', 'true')
  const ctx = canvas.getContext('2d', { willReadFrequently:true })
  if (!ctx) return () => {}
  video.after(canvas)
  const width = canvas.width, height = canvas.height, count = width * height
  const seen = new Uint8Array(count)
  const queue = new Int32Array(count)
  let frame = 0, lastTime = -1, stopped = false, visible = true
  const decodedFrames = typeof video.requestVideoFrameCallback === 'function'
  const schedule = () => {
    frame = decodedFrames ? video.requestVideoFrameCallback(draw) : requestAnimationFrame(draw)
  }
  const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting })
  observer.observe(video)
  const draw = (_now, metadata) => {
    if (stopped) return
    schedule()
    const time = metadata?.mediaTime ?? video.currentTime
    if (document.hidden || !visible || video.readyState < 2 || time === lastTime) return
    lastTime = time
    ctx.drawImage(video, 0, 0, width, height)
    const image = ctx.getImageData(0, 0, width, height)
    const pixels = image.data
    seen.fill(0)
    let head = 0, tail = 0
    const visit = index => {
      if (seen[index]) return
      seen[index] = 1
      const offset = index * 4
      const r = pixels[offset], g = pixels[offset + 1], b = pixels[offset + 2]
      if (Math.min(r, g, b) < 108 || Math.max(r, g, b) - Math.min(r, g, b) > 25) return
      queue[tail++] = index
    }
    for (let x = 0; x < width; x++) { visit(x); visit((height - 1) * width + x) }
    for (let y = 0; y < height; y++) { visit(y * width); visit(y * width + width - 1) }
    while (head < tail) {
      const index = queue[head++]
      pixels[index * 4 + 3] = 0
      if (index % width) visit(index - 1)
      if (index % width < width - 1) visit(index + 1)
      if (index >= width) visit(index - width)
      if (index < count - width) visit(index + width)
    }
    ctx.putImageData(image, 0, 0)
    video.classList.add('has-cutout')
  }
  schedule()
  return () => {
    stopped = true
    if (decodedFrames) video.cancelVideoFrameCallback(frame)
    else cancelAnimationFrame(frame)
    observer.disconnect()
    canvas.remove()
    video.classList.remove('has-cutout')
  }
}

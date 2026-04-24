/**
 * Procedural animated canvas backgrounds for the Quran Reels Generator.
 * Each function renders one frame for elapsed time `t` (milliseconds).
 * All animations loop seamlessly.
 */

// ── Helpers ────────────────────────────────────────────────────────────────

/** Deterministic pseudo-random based on seed */
function rng(seed: number): number {
  const x = Math.sin(seed + 1) * 43758.5453123
  return x - Math.floor(x)
}

/** Linear interpolation */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Clamp a radius value so canvas shape drawing (arc / ellipse / radial
 * gradient) never receives a zero or negative number. This protects against
 * crashes on tiny thumbnail canvases (e.g. 72×128) where size-dependent
 * math can underflow, and against negative modulo results like
 * `(t * freq - ring * 0.15) % 1` which can be < 0 early in the animation.
 */
function safeR(value: number): number {
  if (!Number.isFinite(value)) return 0.1
  return Math.max(0.1, Math.abs(value))
}

// ── 1. Starfield ───────────────────────────────────────────────────────────
export function drawStarfield(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  ctx.fillStyle = '#00010a'
  ctx.fillRect(0, 0, w, h)

  const STARS = 280
  for (let i = 0; i < STARS; i++) {
    const x = rng(i * 3.1) * w
    const y = rng(i * 7.3) * h
    const baseSize = rng(i * 2.7) * 1.8 + 0.3
    const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.0008 + i * 1.3))
    const brightness = Math.floor(lerp(160, 255, twinkle))
    ctx.fillStyle = `rgba(${brightness},${brightness},${Math.min(255, brightness + 30)},${twinkle})`
    ctx.beginPath()
    ctx.arc(x, y, safeR(baseSize * twinkle), 0, Math.PI * 2)
    ctx.fill()
  }

  // Shooting star every ~8s
  const shootT = (t % 8000) / 8000
  if (shootT < 0.06) {
    const prog = shootT / 0.06
    const sx = 0.15 * w + prog * 0.45 * w
    const sy = 0.05 * h + prog * 0.2 * h
    const len = 80 * (1 - prog)
    const grad = ctx.createLinearGradient(sx - len, sy - len * 0.5, sx, sy)
    grad.addColorStop(0, 'rgba(255,255,255,0)')
    grad.addColorStop(1, `rgba(255,255,255,${0.9 * (1 - prog)})`)
    ctx.strokeStyle = grad
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(sx - len, sy - len * 0.5)
    ctx.lineTo(sx, sy)
    ctx.stroke()
  }
}

// ── 2. Aurora ──────────────────────────────────────────────────────────────
export function drawAurora(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  ctx.fillStyle = '#000812'
  ctx.fillRect(0, 0, w, h)

  // Background stars
  for (let i = 0; i < 120; i++) {
    const x = rng(i * 5.1) * w
    const y = rng(i * 9.7) * h * 0.5
    const a = 0.2 + 0.3 * rng(i * 3.3)
    ctx.fillStyle = `rgba(200,210,255,${a})`
    ctx.beginPath(); ctx.arc(x, y, safeR(0.8), 0, Math.PI * 2); ctx.fill()
  }

  // Aurora bands
  const bands = [
    { color: [0, 255, 120], yBase: 0.25, amp: 0.12, freq: 1.2, speed: 0.0003 },
    { color: [0, 180, 255], yBase: 0.35, amp: 0.10, freq: 0.8, speed: 0.00025 },
    { color: [120, 0, 255], yBase: 0.42, amp: 0.08, freq: 1.5, speed: 0.0004 },
  ]

  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  for (const band of bands) {
    const [r, g, b] = band.color
    const points: [number, number][] = []
    const step = w / 60
    for (let x = 0; x <= w; x += step) {
      const nx = x / w
      const y = h * (band.yBase
        + band.amp * Math.sin(nx * Math.PI * 2 * band.freq + t * band.speed * 5000)
        + band.amp * 0.5 * Math.sin(nx * Math.PI * 4 * band.freq - t * band.speed * 3000 + 1))
      points.push([x, y])
    }

    // Draw glowing ribbon
    const ribbonH = h * 0.18
    ctx.beginPath()
    ctx.moveTo(points[0][0], points[0][1])
    for (const [px, py] of points) ctx.lineTo(px, py)
    for (let j = points.length - 1; j >= 0; j--) ctx.lineTo(points[j][0], points[j][1] + ribbonH)
    ctx.closePath()

    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, `rgba(${r},${g},${b},0)`)
    grad.addColorStop(0.3, `rgba(${r},${g},${b},0.18)`)
    grad.addColorStop(0.7, `rgba(${r},${g},${b},0.10)`)
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
    ctx.fillStyle = grad
    ctx.fill()
  }
  ctx.restore()
}

// ── 3. Ocean Waves ─────────────────────────────────────────────────────────
export function drawOcean(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.45)
  skyGrad.addColorStop(0, '#000818')
  skyGrad.addColorStop(1, '#001a40')
  ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, w, h * 0.45)

  const seaGrad = ctx.createLinearGradient(0, h * 0.4, 0, h)
  seaGrad.addColorStop(0, '#001a40')
  seaGrad.addColorStop(0.4, '#00305e')
  seaGrad.addColorStop(1, '#001428')
  ctx.fillStyle = seaGrad; ctx.fillRect(0, h * 0.4, w, h * 0.6)

  // Moon reflection on water
  const moonX = w * 0.72, moonY = h * 0.12
  const moonGrad = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, safeR(40))
  moonGrad.addColorStop(0, 'rgba(255,248,230,1)')
  moonGrad.addColorStop(0.4, 'rgba(255,240,200,0.8)')
  moonGrad.addColorStop(1, 'rgba(255,240,200,0)')
  ctx.fillStyle = moonGrad; ctx.beginPath(); ctx.arc(moonX, moonY, safeR(40), 0, Math.PI * 2); ctx.fill()

  // Moon shimmer on sea
  for (let i = 0; i < 12; i++) {
    const shimX = moonX + (rng(i * 4.7) - 0.5) * 120
    const shimY = h * (0.5 + rng(i * 3.1) * 0.4)
    const shimW = 20 + rng(i * 6.3) * 60
    const a = 0.05 * (1 - (shimY - h * 0.5) / (h * 0.4)) * Math.abs(Math.sin(t * 0.002 + i))
    ctx.fillStyle = `rgba(255,248,200,${a})`
    ctx.fillRect(shimX - shimW / 2, shimY, shimW, 4)
  }

  // Waves
  for (let layer = 5; layer >= 0; layer--) {
    const yBase = h * (0.44 + layer * 0.09)
    const amp = 12 + layer * 5
    const speed = 0.0006 - layer * 0.00005
    const alpha = 0.05 + layer * 0.045

    ctx.beginPath()
    ctx.moveTo(0, h)
    for (let x = 0; x <= w; x += 4) {
      const y = yBase
        + amp * Math.sin(x * 0.006 + t * speed * 5)
        + amp * 0.4 * Math.sin(x * 0.013 - t * speed * 3 + layer)
      ctx.lineTo(x, y)
    }
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath()
    const waveGrad = ctx.createLinearGradient(0, yBase - amp, 0, yBase + amp + 20)
    waveGrad.addColorStop(0, `rgba(80,180,255,${alpha + 0.04})`)
    waveGrad.addColorStop(1, `rgba(0,80,180,${alpha})`)
    ctx.fillStyle = waveGrad; ctx.fill()

    // White foam crests
    if (layer < 4) {
      ctx.strokeStyle = `rgba(200,240,255,${alpha * 0.6})`
      ctx.lineWidth = 1.5
      ctx.beginPath()
      for (let x = 0; x <= w; x += 4) {
        const y = yBase + amp * Math.sin(x * 0.006 + t * speed * 5) + amp * 0.4 * Math.sin(x * 0.013 - t * speed * 3 + layer)
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
  }
}

// ── 4. Rain ────────────────────────────────────────────────────────────────
export function drawRain(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, '#060c14'); grad.addColorStop(1, '#0a1220')
  ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h)

  // Lightning flash
  const flashT = (t % 7000) / 7000
  if (flashT < 0.04) {
    ctx.fillStyle = `rgba(220,230,255,${0.08 * (1 - flashT / 0.04)})`
    ctx.fillRect(0, 0, w, h)
  }

  // Rain drops
  ctx.strokeStyle = 'rgba(150,180,220,0.35)'
  ctx.lineWidth = 1
  const DROPS = 200
  const dropH = 25
  const angle = 0.15 // slight angle
  ctx.save()
  for (let i = 0; i < DROPS; i++) {
    const speed = 0.8 + rng(i * 4.1) * 0.8
    const cycleMs = (h + dropH) / speed
    const x0 = rng(i * 3.7) * (w + 100) - 50
    const yPhase = (rng(i * 9.3) * cycleMs + t * speed) % cycleMs
    const y = -dropH + yPhase
    ctx.beginPath()
    ctx.moveTo(x0 + y * angle, y)
    ctx.lineTo(x0 + (y + dropH) * angle, y + dropH)
    ctx.stroke()
  }
  ctx.restore()

  // Puddle ripples at bottom
  for (let i = 0; i < 5; i++) {
    const rx = rng(i * 5.5) * w
    const ry = h * 0.92 + rng(i * 2.9) * h * 0.06
    const phase = ((t * 0.002 + i * 1.3) % (Math.PI * 2))
    const radius = safeR(10 + phase * 25)
    const alpha = Math.max(0, 0.2 - phase * 0.03)
    ctx.strokeStyle = `rgba(150,200,255,${alpha})`
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.ellipse(rx, ry, radius, safeR(radius * 0.25), 0, 0, Math.PI * 2); ctx.stroke()
  }
}

// ── 5. Desert Sunset ────────────────────────────────────────────────────────
export function drawDesert(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.55)
  skyGrad.addColorStop(0, '#0d0510')
  skyGrad.addColorStop(0.3, '#2a0a00')
  skyGrad.addColorStop(0.7, '#c84000')
  skyGrad.addColorStop(1, '#ff8800')
  ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, w, h * 0.55)

  // Sun/moon near horizon
  const sunX = w * 0.5, sunY = h * 0.5
  const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, safeR(60))
  sunGrad.addColorStop(0, 'rgba(255,200,80,1)')
  sunGrad.addColorStop(0.5, 'rgba(255,120,0,0.6)')
  sunGrad.addColorStop(1, 'rgba(255,80,0,0)')
  ctx.fillStyle = sunGrad; ctx.beginPath(); ctx.arc(sunX, sunY, safeR(60), 0, Math.PI * 2); ctx.fill()

  // Sand dunes
  const duneGrad = ctx.createLinearGradient(0, h * 0.5, 0, h)
  duneGrad.addColorStop(0, '#c87020')
  duneGrad.addColorStop(0.3, '#a05018')
  duneGrad.addColorStop(1, '#603010')
  ctx.fillStyle = duneGrad

  for (let d = 0; d < 4; d++) {
    const yBase = h * (0.52 + d * 0.12)
    const shift = t * 0.00004 * (d + 1)
    ctx.beginPath(); ctx.moveTo(-10, h)
    for (let x = -10; x <= w + 10; x += 5) {
      const nx = (x / w + shift) % 1
      const y = yBase
        - h * 0.12 * Math.pow(Math.sin(nx * Math.PI), 2)
        - h * 0.04 * Math.pow(Math.sin(nx * Math.PI * 2.3 + 0.7), 2)
      ctx.lineTo(x, y)
    }
    ctx.lineTo(w + 10, h); ctx.lineTo(-10, h); ctx.closePath()
    ctx.globalAlpha = 0.6 + d * 0.1; ctx.fill()
  }
  ctx.globalAlpha = 1

  // Sand particles
  for (let i = 0; i < 60; i++) {
    const speed = 0.04 + rng(i * 3.1) * 0.08
    const x = ((rng(i * 4.7) * w + t * speed) % (w + 20)) - 10
    const y = h * (0.6 + rng(i * 7.3) * 0.35)
    const size = 0.8 + rng(i * 5.5) * 1.5
    ctx.fillStyle = `rgba(255,200,100,${0.2 + rng(i * 2.3) * 0.2})`
    ctx.beginPath(); ctx.arc(x, y, safeR(size), 0, Math.PI * 2); ctx.fill()
  }
}

// ── 6. Galaxy ──────────────────────────────────────────────────────────────
export function drawGalaxy(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  ctx.fillStyle = '#00000a'; ctx.fillRect(0, 0, w, h)

  const cx = w * 0.5, cy = h * 0.5
  const rot = t * 0.00005

  // Background stars
  for (let i = 0; i < 150; i++) {
    const x = rng(i * 3.1) * w; const y = rng(i * 7.7) * h
    const a = 0.1 + 0.2 * rng(i * 5.5)
    ctx.fillStyle = `rgba(200,210,255,${a})`
    ctx.beginPath(); ctx.arc(x, y, safeR(0.6), 0, Math.PI * 2); ctx.fill()
  }

  // Galaxy spiral arms
  ctx.save(); ctx.globalCompositeOperation = 'screen'
  const ARM_STARS = 600
  for (let i = 0; i < ARM_STARS; i++) {
    const arm = i % 3
    const r = (i / ARM_STARS) * Math.min(w, h) * 0.42
    const theta = (i / ARM_STARS) * Math.PI * 6 + (arm * Math.PI * 2 / 3) + rot
    const spread = r * 0.18
    const x = cx + (r + (rng(i * 8.1) - 0.5) * spread) * Math.cos(theta)
    const y = cy + (r + (rng(i * 6.3) - 0.5) * spread * 0.5) * Math.sin(theta)
    const brightness = 0.3 + 0.5 * (1 - i / ARM_STARS)
    const colors = ['220,200,255', '200,220,255', '255,220,200']
    const cr = colors[arm]
    ctx.fillStyle = `rgba(${cr},${brightness})`
    ctx.beginPath(); ctx.arc(x, y, safeR(0.8 + rng(i * 2.9) * 1.2), 0, Math.PI * 2); ctx.fill()
  }

  // Bright core
  const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, safeR(80))
  coreGrad.addColorStop(0, 'rgba(255,240,200,0.6)')
  coreGrad.addColorStop(0.4, 'rgba(200,180,255,0.2)')
  coreGrad.addColorStop(1, 'rgba(100,80,200,0)')
  ctx.fillStyle = coreGrad; ctx.beginPath(); ctx.arc(cx, cy, safeR(80), 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}

// ── 7. Candlelight ────────────────────────────────────────────────────────
export function drawCandle(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const flicker = 0.85 + 0.15 * Math.sin(t * 0.012) * Math.sin(t * 0.019 + 0.5)

  // Dark room gradient
  const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.65, 0, w * 0.5, h * 0.65, safeR(w * 0.7))
  bgGrad.addColorStop(0, `rgba(80,40,10,${0.5 * flicker})`)
  bgGrad.addColorStop(0.5, '#160800')
  bgGrad.addColorStop(1, '#080300')
  ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, w, h)

  // Candle body
  const cx = w * 0.5, candleTop = h * 0.58, candleH = h * 0.3
  ctx.fillStyle = '#f5e8c8'
  ctx.fillRect(cx - 22, candleTop, 44, candleH)
  // Candle highlight
  const candleGrad = ctx.createLinearGradient(cx - 22, 0, cx + 22, 0)
  candleGrad.addColorStop(0, 'rgba(255,255,255,0.1)')
  candleGrad.addColorStop(0.3, 'rgba(255,255,255,0.25)')
  candleGrad.addColorStop(1, 'rgba(0,0,0,0.1)')
  ctx.fillStyle = candleGrad; ctx.fillRect(cx - 22, candleTop, 44, candleH)

  // Wick
  ctx.strokeStyle = '#333'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(cx, candleTop); ctx.lineTo(cx + 3, candleTop - 14); ctx.stroke()

  // Flame
  const flameX = cx + 3, flameY = candleTop - 14
  const fH = (50 + 20 * flicker) * flicker
  const fW = (18 + 8 * flicker) * flicker
  const flameSway = 5 * Math.sin(t * 0.007)

  const flameGrad = ctx.createRadialGradient(flameX + flameSway, flameY, 2, flameX + flameSway, flameY - fH * 0.4, safeR(fH))
  flameGrad.addColorStop(0, 'rgba(255,255,200,1)')
  flameGrad.addColorStop(0.2, 'rgba(255,200,50,0.9)')
  flameGrad.addColorStop(0.6, 'rgba(255,80,0,0.5)')
  flameGrad.addColorStop(1, 'rgba(255,0,0,0)')

  ctx.save(); ctx.globalCompositeOperation = 'screen'
  ctx.fillStyle = flameGrad
  ctx.beginPath()
  ctx.moveTo(flameX + flameSway, flameY - fH)
  ctx.bezierCurveTo(flameX + fW + flameSway, flameY - fH * 0.5, flameX + fW * 0.5 + flameSway, flameY, flameX + flameSway, flameY)
  ctx.bezierCurveTo(flameX - fW * 0.5 + flameSway, flameY, flameX - fW + flameSway, flameY - fH * 0.5, flameX + flameSway, flameY - fH)
  ctx.fill()

  // Light glow
  const glowGrad = ctx.createRadialGradient(flameX, flameY, 0, flameX, flameY, safeR(280))
  glowGrad.addColorStop(0, `rgba(255,160,30,${0.35 * flicker})`)
  glowGrad.addColorStop(0.4, `rgba(255,100,0,${0.12 * flicker})`)
  glowGrad.addColorStop(1, 'rgba(200,60,0,0)')
  ctx.fillStyle = glowGrad; ctx.beginPath(); ctx.arc(flameX, flameY, safeR(280), 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}

// ── 8. Snow ────────────────────────────────────────────────────────────────
export function drawSnow(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, '#0a1020'); grad.addColorStop(0.6, '#1a2540'); grad.addColorStop(1, '#2a3550')
  ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h)

  // Ground snow
  const groundGrad = ctx.createLinearGradient(0, h * 0.82, 0, h)
  groundGrad.addColorStop(0, 'rgba(220,230,255,0.9)'); groundGrad.addColorStop(1, 'rgba(200,215,245,1)')
  ctx.fillStyle = groundGrad
  ctx.beginPath(); ctx.moveTo(0, h * 0.85)
  for (let x = 0; x <= w; x += 30) {
    ctx.lineTo(x, h * (0.82 + 0.04 * Math.sin(x * 0.01)))
  }
  ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill()

  // Snowflakes
  const FLAKES = 180
  for (let i = 0; i < FLAKES; i++) {
    const speed = 0.3 + rng(i * 5.3) * 0.5
    const drift = Math.sin(t * 0.001 + i * 0.8) * 1.5
    const cycleMs = (h * 0.85) / speed
    const yPhase = (rng(i * 7.7) * cycleMs + t * speed) % cycleMs
    const x = (rng(i * 3.1) * w + drift * yPhase * 0.1) % w
    const y = yPhase
    const size = 1.2 + rng(i * 4.4) * 2.5
    const alpha = 0.5 + 0.4 * rng(i * 6.6)
    ctx.fillStyle = `rgba(220,235,255,${alpha})`
    ctx.beginPath(); ctx.arc(x, y, safeR(size), 0, Math.PI * 2); ctx.fill()
  }
}

// ── 9. Forest Night ───────────────────────────────────────────────────────
export function drawForest(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.6)
  skyGrad.addColorStop(0, '#000510'); skyGrad.addColorStop(1, '#0a1a0a')
  ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, w, h)

  // Moon
  const moonGrad = ctx.createRadialGradient(w * 0.65, h * 0.08, 0, w * 0.65, h * 0.08, safeR(35))
  moonGrad.addColorStop(0, 'rgba(255,250,220,1)')
  moonGrad.addColorStop(0.6, 'rgba(220,230,200,0.7)')
  moonGrad.addColorStop(1, 'rgba(200,220,180,0)')
  ctx.fillStyle = moonGrad; ctx.beginPath(); ctx.arc(w * 0.65, h * 0.08, safeR(35), 0, Math.PI * 2); ctx.fill()

  // Stars
  for (let i = 0; i < 80; i++) {
    const x = rng(i * 3.3) * w; const y = rng(i * 8.1) * h * 0.45
    const a = 0.3 + 0.4 * Math.abs(Math.sin(t * 0.001 + i * 2))
    ctx.fillStyle = `rgba(220,230,255,${a})`
    ctx.beginPath(); ctx.arc(x, y, safeR(0.8), 0, Math.PI * 2); ctx.fill()
  }

  // Tree silhouettes
  const treeGrad = ctx.createLinearGradient(0, 0, 0, h)
  treeGrad.addColorStop(0, '#0a1a05'); treeGrad.addColorStop(1, '#050d03')
  ctx.fillStyle = treeGrad
  for (let i = 0; i < 14; i++) {
    const tx = rng(i * 4.7) * w
    const th = h * (0.35 + rng(i * 6.3) * 0.25)
    const tw = th * 0.28
    ctx.beginPath()
    ctx.moveTo(tx, h * 0.95)
    ctx.lineTo(tx - tw / 2, h * 0.95 - th * 0.3)
    ctx.lineTo(tx - tw * 0.4, h * 0.95 - th * 0.3)
    ctx.lineTo(tx - tw / 2.5, h * 0.95 - th * 0.6)
    ctx.lineTo(tx - tw * 0.3, h * 0.95 - th * 0.6)
    ctx.lineTo(tx, h * 0.95 - th)
    ctx.lineTo(tx + tw * 0.3, h * 0.95 - th * 0.6)
    ctx.lineTo(tx + tw / 2.5, h * 0.95 - th * 0.6)
    ctx.lineTo(tx + tw * 0.4, h * 0.95 - th * 0.3)
    ctx.lineTo(tx + tw / 2, h * 0.95 - th * 0.3)
    ctx.closePath(); ctx.fill()
  }

  // Fireflies
  for (let i = 0; i < 20; i++) {
    const fx = rng(i * 5.5) * w
    const fy = h * (0.45 + rng(i * 3.7) * 0.4)
    const glow = Math.abs(Math.sin(t * 0.002 * (1 + rng(i * 2.1) * 0.5) + i * 2.4))
    if (glow > 0.6) {
      const gr = ctx.createRadialGradient(fx, fy, 0, fx, fy, safeR(12))
      gr.addColorStop(0, `rgba(180,255,100,${glow * 0.8})`)
      gr.addColorStop(1, 'rgba(150,255,80,0)')
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(fx, fy, safeR(12), 0, Math.PI * 2); ctx.fill()
    }
  }
}

// ── 10. Nebula ────────────────────────────────────────────────────────────
export function drawNebula(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  ctx.fillStyle = '#000005'; ctx.fillRect(0, 0, w, h)

  ctx.save(); ctx.globalCompositeOperation = 'screen'

  const clouds = [
    { x: 0.3, y: 0.35, r: 0.45, color: '80,0,200', speed: 0.000015 },
    { x: 0.7, y: 0.6,  r: 0.35, color: '0,80,200', speed: 0.000012 },
    { x: 0.5, y: 0.2,  r: 0.3,  color: '200,0,100', speed: 0.00002 },
    { x: 0.2, y: 0.7,  r: 0.25, color: '0,150,200', speed: 0.000018 },
    { x: 0.8, y: 0.3,  r: 0.28, color: '150,0,200', speed: 0.000014 },
  ]

  for (const c of clouds) {
    const drift = Math.sin(t * c.speed * Math.PI * 2) * 0.04
    const cx2 = (c.x + drift) * w, cy2 = c.y * h
    const gr = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, safeR(c.r * Math.min(w, h)))
    gr.addColorStop(0, `rgba(${c.color},0.18)`)
    gr.addColorStop(0.5, `rgba(${c.color},0.08)`)
    gr.addColorStop(1, `rgba(${c.color},0)`)
    ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h)
  }

  // Stars
  for (let i = 0; i < 200; i++) {
    const x = rng(i * 3.1) * w; const y = rng(i * 8.7) * h
    const a = 0.2 + 0.7 * Math.abs(Math.sin(t * 0.0007 + i * 1.3))
    ctx.fillStyle = `rgba(255,255,255,${a})`
    ctx.beginPath(); ctx.arc(x, y, safeR(0.5 + rng(i * 4.4)), 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}

// ── 11. Fire ──────────────────────────────────────────────────────────────
export function drawFire(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, '#060000'); grad.addColorStop(0.5, '#120400'); grad.addColorStop(1, '#1a0800')
  ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h)

  ctx.save(); ctx.globalCompositeOperation = 'screen'

  const PARTICLES = 150
  for (let i = 0; i < PARTICLES; i++) {
    const life = (t * (0.0008 + rng(i * 4.1) * 0.0006) + rng(i * 7.7)) % 1
    const x = w * (0.3 + rng(i * 3.3) * 0.4) + Math.sin(t * 0.004 + i) * 40 * (1 - life)
    const y = h * (0.95 - life * 0.8)
    const size = (1 - life) * (15 + rng(i * 5.5) * 25)
    const alpha = (1 - life) * 0.7

    const colors: [string, string, string] = life < 0.3
      ? ['255,255,200', '255,200,0', '255,100,0']
      : life < 0.6
      ? ['255,150,0', '255,80,0', '200,30,0']
      : ['180,20,0', '120,10,0', '60,0,0']

    const safeSize = safeR(size)
    const gr = ctx.createRadialGradient(x, y, 0, x, y, safeSize)
    gr.addColorStop(0, `rgba(${colors[0]},${alpha})`)
    gr.addColorStop(0.5, `rgba(${colors[1]},${alpha * 0.6})`)
    gr.addColorStop(1, `rgba(${colors[2]},0)`)
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, safeSize, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}

// ── 12. Water Ripple ──────────────────────────────────────────────────────
export function drawWaterRipple(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, '#001428'); grad.addColorStop(1, '#002a50')
  ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h)

  // Caustic light patterns
  ctx.save(); ctx.globalCompositeOperation = 'screen'
  for (let i = 0; i < 8; i++) {
    const cx2 = rng(i * 5.5) * w
    const cy2 = rng(i * 3.3) * h
    const phase = t * 0.001 + i * 0.8
    const r = safeR(80 + 60 * Math.sin(phase))
    const gr = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, r)
    gr.addColorStop(0, `rgba(0,150,255,${0.06 + 0.04 * Math.sin(phase)})`)
    gr.addColorStop(1, 'rgba(0,80,180,0)')
    ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h)
  }
  ctx.restore()

  // Concentric ripples
  const rippleSources = [
    { x: 0.3, y: 0.4, freq: 0.0008 },
    { x: 0.7, y: 0.6, freq: 0.0006 },
    { x: 0.5, y: 0.25, freq: 0.001 },
  ]
  for (const src of rippleSources) {
    const cx2 = src.x * w, cy2 = src.y * h
    for (let ring = 0; ring < 8; ring++) {
      // `(x % 1)` is negative in JS when x < 0, so normalize into [0, 1).
      const rawPhase = (t * src.freq - ring * 0.15) % 1
      const phase = rawPhase < 0 ? rawPhase + 1 : rawPhase
      const r = safeR(phase * Math.min(w, h) * 0.5)
      const ry = safeR(r * 0.4)
      const alpha = Math.max(0, (1 - phase) * 0.12)
      ctx.strokeStyle = `rgba(100,200,255,${alpha})`
      ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.ellipse(cx2, cy2, r, ry, 0, 0, Math.PI * 2); ctx.stroke()
    }
  }
}

// ── 13. Mountains ─────────────────────────────────────────────────────────
export function drawMountains(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  // Sky
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.6)
  skyGrad.addColorStop(0, '#000510'); skyGrad.addColorStop(0.5, '#0a1030'); skyGrad.addColorStop(1, '#152040')
  ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, w, h)

  // Stars
  for (let i = 0; i < 100; i++) {
    const x = rng(i * 3.3) * w; const y = rng(i * 9.1) * h * 0.55
    const a = 0.25 + 0.4 * Math.abs(Math.sin(t * 0.0007 + i * 1.8))
    ctx.fillStyle = `rgba(220,230,255,${a})`
    ctx.beginPath(); ctx.arc(x, y, safeR(0.7 + rng(i * 4.2) * 0.8), 0, Math.PI * 2); ctx.fill()
  }

  // Mist layer
  const mistGrad = ctx.createLinearGradient(0, h * 0.55, 0, h * 0.72)
  mistGrad.addColorStop(0, 'rgba(150,170,200,0)'); mistGrad.addColorStop(1, 'rgba(150,170,200,0.12)')
  ctx.fillStyle = mistGrad; ctx.fillRect(0, h * 0.55, w, h * 0.17)

  // Mountain layers
  const layers = [
    { color: '#1a2535', yBase: 0.65, peaks: 5, height: 0.35 },
    { color: '#0f1a28', yBase: 0.72, peaks: 4, height: 0.28 },
    { color: '#080e18', yBase: 0.80, peaks: 3, height: 0.22 },
  ]
  for (const layer of layers) {
    ctx.fillStyle = layer.color
    ctx.beginPath(); ctx.moveTo(0, h)
    // Draw mountain silhouette
    const segW = w / (layer.peaks * 2)
    for (let s = 0; s <= layer.peaks * 2; s++) {
      const x = s * segW
      const isPeak = s % 2 === 1
      const py = isPeak
        ? h * layer.yBase - h * layer.height * (0.7 + 0.3 * rng(s * 4.1))
        : h * layer.yBase + h * 0.02 * rng(s * 3.3)
      ctx.lineTo(x, py)
    }
    ctx.lineTo(w, h); ctx.closePath(); ctx.fill()
  }

  // Snow caps on closest layer
  ctx.fillStyle = 'rgba(220,230,255,0.85)'
  const lastLayer = layers[0]
  ctx.save(); ctx.beginPath(); ctx.moveTo(0, h)
  const segW2 = w / (lastLayer.peaks * 2)
  for (let s = 0; s <= lastLayer.peaks * 2; s++) {
    const x = s * segW2
    const isPeak = s % 2 === 1
    const py = isPeak
      ? h * lastLayer.yBase - h * lastLayer.height * (0.7 + 0.3 * rng(s * 4.1))
      : h * lastLayer.yBase + h * 0.02 * rng(s * 3.3)
    ctx.lineTo(x, py)
  }
  ctx.lineTo(w, h); ctx.closePath(); ctx.clip()
  // Snow only near peaks
  for (let s = 1; s <= lastLayer.peaks * 2; s += 2) {
    const x = s * segW2
    const peakY = h * lastLayer.yBase - h * lastLayer.height * (0.7 + 0.3 * rng(s * 4.1))
    const capH = h * 0.06
    ctx.beginPath()
    ctx.moveTo(x, peakY); ctx.lineTo(x - segW2 * 0.4, peakY + capH); ctx.lineTo(x + segW2 * 0.4, peakY + capH)
    ctx.closePath(); ctx.fill()
  }
  ctx.restore()
}

// ── 14. Green Hills ──────────────────────────────────────────────────────
export function drawGreenHills(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  // Warm sky
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.55)
  skyGrad.addColorStop(0, '#0a0520'); skyGrad.addColorStop(0.4, '#1a0a40'); skyGrad.addColorStop(1, '#2a1060')
  ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, w, h)

  // Stars/planets
  for (let i = 0; i < 80; i++) {
    const x = rng(i * 4.1) * w; const y = rng(i * 7.3) * h * 0.5
    const a = 0.3 + 0.5 * Math.abs(Math.sin(t * 0.0006 + i))
    ctx.fillStyle = `rgba(220,210,255,${a})`
    ctx.beginPath(); ctx.arc(x, y, safeR(0.6 + rng(i * 3.5) * 1.4), 0, Math.PI * 2); ctx.fill()
  }

  // Rolling hills
  const hillColors = ['#0a2010', '#0d2814', '#102e18', '#122016']
  for (let layer = 3; layer >= 0; layer--) {
    const yBase = h * (0.5 + layer * 0.12)
    const amp = h * (0.1 - layer * 0.015)
    const shift = t * 0.00002 * (layer + 1)

    ctx.fillStyle = hillColors[layer]
    ctx.beginPath(); ctx.moveTo(-10, h)
    for (let x = -10; x <= w + 10; x += 4) {
      const nx = x / w + shift
      const y = yBase
        - amp * Math.sin(nx * Math.PI * 1.5 + layer)
        - amp * 0.4 * Math.sin(nx * Math.PI * 3.2 + layer * 0.7)
      ctx.lineTo(x, y)
    }
    ctx.lineTo(w + 10, h); ctx.closePath(); ctx.fill()
  }

  // Fireflies / sparkles
  for (let i = 0; i < 25; i++) {
    const fx = rng(i * 5.5) * w
    const fy = h * (0.5 + rng(i * 3.7) * 0.45)
    const glow = Math.pow(Math.abs(Math.sin(t * 0.0015 * (1 + rng(i) * 0.5) + i * 1.7)), 3)
    if (glow > 0.3) {
      ctx.fillStyle = `rgba(200,255,150,${glow * 0.7})`
      ctx.beginPath(); ctx.arc(fx, fy, safeR(2 * glow), 0, Math.PI * 2); ctx.fill()
    }
  }
}

// ── 15. Crescent Moon ──────────────────────────────────────────────────────
// Deep night sky, large crescent rising in the upper-third, slowly twinkling stars.
export function drawCrescent(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  // Sky gradient — deep indigo at top, warm horizon hint at bottom
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#060820')
  sky.addColorStop(0.6, '#0d1438')
  sky.addColorStop(1, '#1a1028')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  // Stars
  for (let i = 0; i < 220; i++) {
    const x = rng(i * 2.9) * w
    const y = rng(i * 6.3) * h * 0.9
    const base = rng(i * 1.7) * 1.6 + 0.3
    const tw = 0.3 + 0.7 * Math.abs(Math.sin(t * 0.0009 + i * 1.3))
    ctx.fillStyle = `rgba(${Math.floor(lerp(200, 255, tw))},${Math.floor(lerp(210, 250, tw))},255,${tw * 0.9})`
    ctx.beginPath(); ctx.arc(x, y, safeR(base * tw), 0, Math.PI * 2); ctx.fill()
  }

  // Crescent — very slight vertical drift
  const cx = w * 0.62
  const cy = h * 0.30 + Math.sin(t * 0.00018) * h * 0.01
  const r = Math.min(w, h) * 0.14

  // Moon glow halo
  const halo = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 3)
  halo.addColorStop(0, 'rgba(255,238,200,0.35)')
  halo.addColorStop(0.4, 'rgba(255,220,160,0.12)')
  halo.addColorStop(1, 'rgba(255,220,160,0)')
  ctx.fillStyle = halo
  ctx.beginPath(); ctx.arc(cx, cy, safeR(r * 3), 0, Math.PI * 2); ctx.fill()

  // Full moon disc (warm ivory)
  const moonGrad = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.25, r * 0.2, cx, cy, r)
  moonGrad.addColorStop(0, '#FFF4D8')
  moonGrad.addColorStop(0.7, '#F4E4B0')
  moonGrad.addColorStop(1, '#D9C488')
  ctx.fillStyle = moonGrad
  ctx.beginPath(); ctx.arc(cx, cy, safeR(r), 0, Math.PI * 2); ctx.fill()

  // Carve crescent — subtract a slightly offset disc in sky color
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  ctx.beginPath()
  ctx.arc(cx + r * 0.38, cy - r * 0.08, safeR(r * 0.92), 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

// ── 16. Mosque Silhouette ──────────────────────────────────────────────────
// Deep warm night sky, twinkling stars, soft silhouette of domes and minarets.
export function drawMosque(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#0a0a18')
  sky.addColorStop(0.55, '#1a1124')
  sky.addColorStop(0.85, '#3b1f1a')
  sky.addColorStop(1, '#5a2a1a')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  // Stars in upper half
  for (let i = 0; i < 140; i++) {
    const x = rng(i * 3.1) * w
    const y = rng(i * 7.3) * h * 0.55
    const size = 0.4 + rng(i * 1.9) * 1.2
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.0007 + i * 0.9))
    ctx.fillStyle = `rgba(255,236,200,${tw * 0.85})`
    ctx.beginPath(); ctx.arc(x, y, safeR(size * tw), 0, Math.PI * 2); ctx.fill()
  }

  // Small drifting crescent in upper-left
  const cmx = w * 0.18
  const cmy = h * 0.18
  const cmr = Math.min(w, h) * 0.045
  ctx.fillStyle = 'rgba(255,230,170,0.95)'
  ctx.beginPath(); ctx.arc(cmx, cmy, safeR(cmr), 0, Math.PI * 2); ctx.fill()
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  ctx.beginPath(); ctx.arc(cmx + cmr * 0.35, cmy - cmr * 0.1, safeR(cmr * 0.9), 0, Math.PI * 2); ctx.fill()
  ctx.restore()

  // Silhouette ground
  const horizonY = h * 0.78
  ctx.fillStyle = '#050608'
  ctx.fillRect(0, horizonY, w, h - horizonY)

  // Helper: dome
  const drawDome = (x: number, domeR: number, baseY: number, height: number) => {
    ctx.beginPath()
    ctx.moveTo(x - domeR, baseY)
    ctx.bezierCurveTo(x - domeR, baseY - height, x + domeR, baseY - height, x + domeR, baseY)
    ctx.closePath()
    ctx.fill()
    // finial
    ctx.beginPath()
    ctx.moveTo(x, baseY - height)
    ctx.lineTo(x - 2, baseY - height - domeR * 0.25)
    ctx.lineTo(x + 2, baseY - height - domeR * 0.25)
    ctx.closePath()
    ctx.fill()
    // crescent on dome
    ctx.save()
    ctx.fillStyle = 'rgba(255,220,160,0.85)'
    const finialTop = baseY - height - domeR * 0.25
    ctx.beginPath(); ctx.arc(x, finialTop - domeR * 0.18, safeR(domeR * 0.1), 0, Math.PI * 2); ctx.fill()
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath(); ctx.arc(x + domeR * 0.04, finialTop - domeR * 0.2, safeR(domeR * 0.09), 0, Math.PI * 2); ctx.fill()
    ctx.restore()
    ctx.fillStyle = '#050608'
  }

  // Helper: minaret
  const drawMinaret = (x: number, baseY: number, height: number, width: number) => {
    ctx.fillRect(x - width / 2, baseY - height, width, height)
    // cap dome
    ctx.beginPath()
    ctx.moveTo(x - width * 0.9, baseY - height)
    ctx.bezierCurveTo(x - width * 0.9, baseY - height - width * 1.3, x + width * 0.9, baseY - height - width * 1.3, x + width * 0.9, baseY - height)
    ctx.closePath()
    ctx.fill()
    // spire
    ctx.beginPath()
    ctx.moveTo(x, baseY - height - width * 1.3)
    ctx.lineTo(x - width * 0.15, baseY - height - width * 1.9)
    ctx.lineTo(x + width * 0.15, baseY - height - width * 1.9)
    ctx.closePath()
    ctx.fill()
  }

  ctx.fillStyle = '#050608'
  // Main mosque cluster (center)
  const mainCx = w * 0.5
  const mainDomeR = w * 0.13
  drawDome(mainCx, mainDomeR, horizonY, w * 0.14)
  // Side domes
  drawDome(mainCx - mainDomeR * 1.7, mainDomeR * 0.62, horizonY, w * 0.075)
  drawDome(mainCx + mainDomeR * 1.7, mainDomeR * 0.62, horizonY, w * 0.075)
  // Minarets flanking
  drawMinaret(mainCx - w * 0.28, horizonY, w * 0.28, w * 0.022)
  drawMinaret(mainCx + w * 0.28, horizonY, w * 0.28, w * 0.022)
  // Distant minaret
  drawMinaret(w * 0.08, horizonY, w * 0.17, w * 0.014)
  drawMinaret(w * 0.92, horizonY, w * 0.17, w * 0.014)
}

// ── 17. Desert Dunes (Night) ───────────────────────────────────────────────
// Soft rolling dunes silhouette against starry violet sky.
export function drawDunes(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#0c0520')
  sky.addColorStop(0.5, '#25103a')
  sky.addColorStop(1, '#5a2540')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  // Moon
  const mx = w * 0.25
  const my = h * 0.28
  const mr = Math.min(w, h) * 0.09
  const moonGlow = ctx.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 3.5)
  moonGlow.addColorStop(0, 'rgba(255,240,210,0.3)')
  moonGlow.addColorStop(1, 'rgba(255,240,210,0)')
  ctx.fillStyle = moonGlow
  ctx.beginPath(); ctx.arc(mx, my, safeR(mr * 3.5), 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#FFEED0'
  ctx.beginPath(); ctx.arc(mx, my, safeR(mr), 0, Math.PI * 2); ctx.fill()

  // Stars
  for (let i = 0; i < 160; i++) {
    const x = rng(i * 2.4) * w
    const y = rng(i * 5.7) * h * 0.6
    const size = 0.3 + rng(i * 1.3) * 1.1
    const tw = 0.3 + 0.7 * Math.abs(Math.sin(t * 0.0008 + i * 1.1))
    ctx.fillStyle = `rgba(240,230,255,${tw * 0.85})`
    ctx.beginPath(); ctx.arc(x, y, safeR(size * tw), 0, Math.PI * 2); ctx.fill()
  }

  // Three layered dune silhouettes, slight horizontal drift
  const layers = [
    { y: 0.72, amp: 0.04, color: '#3a1a2a', speed: 0.00003, freq: 3.2 },
    { y: 0.80, amp: 0.05, color: '#261022', speed: 0.00005, freq: 2.5 },
    { y: 0.90, amp: 0.06, color: '#110a1a', speed: 0.00008, freq: 1.8 },
  ]
  for (const L of layers) {
    ctx.fillStyle = L.color
    ctx.beginPath()
    ctx.moveTo(0, h)
    const step = Math.max(4, w / 200)
    const drift = t * L.speed
    for (let x = 0; x <= w; x += step) {
      const theta = (x / w) * Math.PI * L.freq + drift
      const y = h * L.y - Math.sin(theta) * h * L.amp - Math.sin(theta * 2.1 + 1.2) * h * L.amp * 0.35
      ctx.lineTo(x, y)
    }
    ctx.lineTo(w, h); ctx.closePath(); ctx.fill()
  }
}

// ── 18. Geometric Pattern ──────────────────────────────────────────────────
// Slowly rotating 8-point Islamic khatam pattern in gold on deep sapphire.
export function drawGeometric(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  // Background radial
  const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.8)
  bg.addColorStop(0, '#0d1a3a')
  bg.addColorStop(0.6, '#081028')
  bg.addColorStop(1, '#030614')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  // Rotating khatam tiles
  const tile = Math.min(w, h) * 0.28
  const rot = (t * 0.00006) % (Math.PI * 2)

  const drawStar = (cx: number, cy: number, r: number, rotation: number, alpha: number) => {
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(rotation)
    ctx.strokeStyle = `rgba(212,175,55,${alpha})`
    ctx.lineWidth = Math.max(0.8, Math.min(w, h) * 0.0025)
    ctx.beginPath()
    // 8-point star (two overlapping squares rotated 45°)
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI * 2) / 8
      const outer = r
      const inner = r * 0.5
      const ox = Math.cos(a) * outer
      const oy = Math.sin(a) * outer
      const na = ((i + 1) * Math.PI * 2) / 8
      const inBetweenAngle = (a + na) / 2
      const ix = Math.cos(inBetweenAngle) * inner
      const iy = Math.sin(inBetweenAngle) * inner
      if (i === 0) ctx.moveTo(ox, oy)
      else ctx.lineTo(ox, oy)
      ctx.lineTo(ix, iy)
    }
    ctx.closePath()
    ctx.stroke()
    // Inner small circle
    ctx.beginPath()
    ctx.arc(0, 0, safeR(r * 0.12), 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  // Grid of stars
  const cols = Math.ceil(w / tile) + 2
  const rows = Math.ceil(h / tile) + 2
  const offsetX = (w - cols * tile) / 2
  const offsetY = (h - rows * tile) / 2

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = offsetX + c * tile + tile / 2
      const cy = offsetY + r * tile + tile / 2
      const stagger = ((c + r) % 2 === 0) ? 0 : Math.PI / 8
      // Distance-based fade from center for depth
      const dx = cx - w / 2
      const dy = cy - h / 2
      const dist = Math.sqrt(dx * dx + dy * dy) / Math.max(w, h)
      const alpha = Math.max(0.08, 0.55 - dist * 0.8)
      drawStar(cx, cy, tile * 0.42, rot + stagger, alpha)
    }
  }

  // Subtle central glow (gold breath)
  const breath = 0.5 + 0.5 * Math.sin(t * 0.0004)
  const centerGlow = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.min(w, h) * 0.5)
  centerGlow.addColorStop(0, `rgba(212,175,55,${0.08 + breath * 0.08})`)
  centerGlow.addColorStop(1, 'rgba(212,175,55,0)')
  ctx.fillStyle = centerGlow
  ctx.fillRect(0, 0, w, h)
}

// ── 19. Dhikr (slow-drifting names of Allah as distant points) ─────────────
// Calm cosmic drift — soft particles moving in gentle circular flow.
export function drawDhikr(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const bg = ctx.createLinearGradient(0, 0, 0, h)
  bg.addColorStop(0, '#04101a')
  bg.addColorStop(0.5, '#0a1a30')
  bg.addColorStop(1, '#081624')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  const PARTICLES = 200
  for (let i = 0; i < PARTICLES; i++) {
    const baseX = rng(i * 1.7) * w
    const baseY = rng(i * 4.1) * h
    const driftR = 12 + rng(i * 7.9) * 40
    const speed = 0.00015 + rng(i * 2.3) * 0.0003
    const phase = rng(i * 5.1) * Math.PI * 2
    const angle = t * speed + phase
    const x = baseX + Math.cos(angle) * driftR
    const y = baseY + Math.sin(angle * 0.7) * driftR * 0.6
    const size = 0.6 + rng(i * 3.7) * 1.4
    const alpha = 0.3 + 0.6 * Math.abs(Math.sin(t * 0.001 + i * 0.5))
    // warm gold tint
    ctx.fillStyle = `rgba(232,200,130,${alpha * 0.8})`
    ctx.beginPath(); ctx.arc(x, y, safeR(size), 0, Math.PI * 2); ctx.fill()
  }

  // Soft central radial bloom
  const bloom = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.min(w, h) * 0.55)
  bloom.addColorStop(0, 'rgba(180,140,70,0.12)')
  bloom.addColorStop(1, 'rgba(180,140,70,0)')
  ctx.fillStyle = bloom
  ctx.fillRect(0, 0, w, h)
}

// ── Main dispatcher ───────────────────────────────────────────────────────
export function drawAnimatedBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  name: string,
): void {
  switch (name) {
    case 'starfield':   return drawStarfield(ctx, w, h, t)
    case 'aurora':      return drawAurora(ctx, w, h, t)
    case 'ocean':       return drawOcean(ctx, w, h, t)
    case 'rain':        return drawRain(ctx, w, h, t)
    case 'desert':      return drawDesert(ctx, w, h, t)
    case 'galaxy':      return drawGalaxy(ctx, w, h, t)
    case 'candle':      return drawCandle(ctx, w, h, t)
    case 'snow':        return drawSnow(ctx, w, h, t)
    case 'forest':      return drawForest(ctx, w, h, t)
    case 'nebula':      return drawNebula(ctx, w, h, t)
    case 'fire':        return drawFire(ctx, w, h, t)
    case 'water':       return drawWaterRipple(ctx, w, h, t)
    case 'mountains':   return drawMountains(ctx, w, h, t)
    case 'hills':       return drawGreenHills(ctx, w, h, t)
    case 'crescent':    return drawCrescent(ctx, w, h, t)
    case 'mosque':      return drawMosque(ctx, w, h, t)
    case 'dunes':       return drawDunes(ctx, w, h, t)
    case 'geometric':   return drawGeometric(ctx, w, h, t)
    case 'dhikr':       return drawDhikr(ctx, w, h, t)
    default:
      ctx.fillStyle = '#0a0d18'; ctx.fillRect(0, 0, w, h)
  }
}

import { useEffect, useRef } from 'react'

// Configuración editable (JSON) — edita estos valores al inicio del componente
// Ejemplo:
// const custom = {
//   size: 480,
//   pointerSize: 28,
//   colors: ['#fde68a','#bfdbfe','#bbf7d0'],
//   duration: 5000,
//   rotations: 4,
//   dprMax: 2,
//   showLabelsWhenLessThan: 200,
// }
const DEFAULT_CONFIG = {
  size: 200,
  pointerSize: 24,
  colors: ['#fde68a', '#bfdbfe', '#bbf7d0', '#fecaca', '#ddd6fe'],
  duration: 8000,
  rotations: 20,
  dprMax: 2,
  // Si hay más de X items, se ocultan las etiquetas para mejorar rendimiento
  // Mostrar etiquetas por defecto en cada segmento
  showLabelsWhenLessThan: Infinity,
  // Forzar max label characters (base heuristic)
  labelMaxCharsBase: 40,
}

export default function CanvasWheelSpin({ items = [], winningIndex, onSpinEnd, config = {} }) {
  const canvasRef = useRef(null)
  const offscreenRef = useRef(null)
  const rafRef = useRef(null)
  const animationRef = useRef({ running: false })
  // Merge default config with provided config prop
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const size = cfg.size
  const pointerSize = cfg.pointerSize
  const colors = cfg.colors
  const rotations = cfg.rotations
  const dprMax = cfg.dprMax
  const forceShowLabels = cfg.showLabelsWhenLessThan === Infinity || cfg.forceShowLabels
  const pointerLabelRef = useRef(null)
  const blinkTimersRef = useRef([])

  // Helpers
  const mod = (x, m) => ((x % m) + m) % m
  const angleToIndex = (theta, n, anglePer) => {
    const raw = -theta / anglePer
    const v = mod(raw - 0.5, n)
    return Math.floor(v)
  }

  const getInitials = (text) => {
    if (!text) return ''
    const parts = text.split(/\s+/).filter(Boolean)
    if (parts.length === 0) return ''
    if (parts.length === 1) return parts[0].slice(0, 3)
    return (parts[0][0] + (parts[1][0] || '')).toUpperCase()
  }

  const makeShortLabel = (text, n) => {
    const maxChars = Math.max(4, Math.floor(cfg.labelMaxCharsBase / Math.max(1, n)))
    if (text.length <= maxChars) return text
    // If many items, prefer initials to long truncation
    if (n > 200) return getInitials(text)
    return text.slice(0, maxChars - 1) + '…'
  }


  // Crear offscreen canvas que contendrá la rueda pre-renderizada
  useEffect(() => {
    const canvas = document.createElement('canvas')
    // Limitar devicePixelRatio para no generar canvases gigantes en pantallas 4k
    const dpr = Math.min(window.devicePixelRatio || 1, cfg.dprMax)
    canvas.width = Math.round(size * dpr)
    canvas.height = Math.round(size * dpr)
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)

    // Dibujar la rueda estática (sectores + etiquetas)
    const cx = size / 2
    const cy = size / 2
    const radius = size * 0.48
    const n = Math.max(1, items.length)
    const anglePer = (Math.PI * 2) / n

    // Fondo transparente
    ctx.clearRect(0, 0, size, size)

    // Dibujar sectores
    for (let i = 0; i < n; i++) {
      const start = i * anglePer - Math.PI / 2
      const end = start + anglePer
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, radius, start, end)
      ctx.closePath()
      ctx.fillStyle = colors[i % colors.length]
      ctx.fill()

        // Dibujar etiqueta (siempre, pero adaptativa según cantidad de items)
        ctx.save()
        ctx.translate(cx, cy)
        const mid = start + anglePer / 2
        ctx.rotate(mid)
        // Calcular tamaño de fuente adaptativo
        const fontSize = Math.max(7, Math.min(14, (radius * 0.09) * Math.min(1, 40 / n)))
        ctx.font = `${fontSize}px Poppins, sans-serif`
        ctx.fillStyle = '#1f2937'
        ctx.textAlign = 'right'
        ctx.textBaseline = 'middle'
        const labelRadius = radius * 0.82
        const text = String(items[i] ?? '')
        const short = makeShortLabel(text, n)
        ctx.fillText(short, labelRadius, 0)
        ctx.restore()
    }

    // Dibujar círculo central
    ctx.beginPath()
    ctx.arc(cx, cy, radius * 0.15, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()

    offscreenRef.current = canvas

    // Redibujar visible canvas desde el offscreen one
    const visible = canvasRef.current
    if (visible) {
      const vctx = visible.getContext('2d')
      const dprVis = Math.min(window.devicePixelRatio || 1, cfg.dprMax)
      visible.width = Math.round(size * dprVis)
      visible.height = Math.round(size * dprVis)
      visible.style.width = `${size}px`
      visible.style.height = `${size}px`
      vctx.scale(dprVis, dprVis)
      // Draw initial
      vctx.clearRect(0, 0, size, size)
      vctx.drawImage(offscreenRef.current, 0, 0, size, size)
      // Inicializar etiqueta del puntero con el item actual (ángulo = 0)
      try {
        const idx = angleToIndex(0, n, anglePer)
        if (pointerLabelRef.current) {
          pointerLabelRef.current.textContent = items[idx] ?? ''
          // Ensure pointer label is hidden when wheel is at rest
          pointerLabelRef.current.style.visibility = 'hidden'
        }
      } catch (err) {
        // ignore
      }
    }

    return () => {
      // Cleanup
      offscreenRef.current = null
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [items])

  // Animación de giro basada en requestAnimationFrame
  useEffect(() => {
    if (winningIndex == null || !offscreenRef.current || !canvasRef.current) return

    const n = Math.max(1, items.length)
    const anglePer = (Math.PI * 2) / n
    // Queremos que el centro del item seleccionado quede apuntando hacia -Math.PI/2 (arriba)
    const targetAngle = - (winningIndex * anglePer) - anglePer / 2
    const extraRotations = rotations // vueltas completas
    const totalTarget = targetAngle + extraRotations * Math.PI * 2

    const duration = cfg.duration
    const start = performance.now()
    const startAngle = 0

    // Show pointer label while animating to create the 'names passing by' effect
    if (pointerLabelRef.current) pointerLabelRef.current.style.visibility = 'visible'
    animationRef.current.running = true

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)

    const render = (now) => {
      const elapsed = now - start
      const t = Math.min(1, elapsed / duration)
      const eased = easeOutCubic(t)
      const currentAngle = startAngle + (totalTarget - startAngle) * eased

      // Dibujar imagen rotada en canvas visible
      const vis = canvasRef.current
      const vctx = vis.getContext('2d')
      const dprVis = Math.min(window.devicePixelRatio || 1, cfg.dprMax)
      const sizeLocal = size
      // ensure canvas backing store matches DPR
      vis.width = Math.round(sizeLocal * dprVis)
      vis.height = Math.round(sizeLocal * dprVis)
      vis.style.width = `${sizeLocal}px`
      vis.style.height = `${sizeLocal}px`
      vctx.scale(dprVis, dprVis)
      vctx.clearRect(0, 0, sizeLocal, sizeLocal)
      vctx.save()
      vctx.translate(sizeLocal / 2, sizeLocal / 2)
      vctx.rotate(currentAngle)
      vctx.drawImage(offscreenRef.current, -sizeLocal / 2, -sizeLocal / 2, sizeLocal, sizeLocal)
      vctx.restore()

      // Actualizar etiqueta del puntero en cada frame (sin re-render de React)
      try {
        const idx = angleToIndex(currentAngle, n, anglePer)
        if (pointerLabelRef.current) pointerLabelRef.current.textContent = items[idx] ?? ''
      } catch (err) {
        // ignore
      }

      if (t < 1) {
        rafRef.current = requestAnimationFrame(render)
      } else {
        animationRef.current.running = false
        // Normalizar ángulo final para que sea el target exacto
        vctx.clearRect(0, 0, sizeLocal, sizeLocal)
        vctx.save()
        vctx.translate(sizeLocal / 2, sizeLocal / 2)
        vctx.rotate(totalTarget)
        vctx.drawImage(offscreenRef.current, -sizeLocal / 2, -sizeLocal / 2, sizeLocal, sizeLocal)
        vctx.restore()

        // Asegurar etiqueta final
        let finalIdx = 0
        try {
          finalIdx = angleToIndex(totalTarget, n, anglePer)
          if (pointerLabelRef.current) pointerLabelRef.current.textContent = items[finalIdx] ?? ''
        } catch (err) { /* ignore */ }

        // Parpadeo del slice ganador antes de notificar el fin (~1s)
        const blinkCount = 6
        const blinkInterval = Math.max(80, Math.floor((cfg.duration || 1000) * 0.12 / blinkCount))
        const radius = sizeLocal * 0.48
        const startAngle = finalIdx * anglePer - Math.PI / 2
        const endAngle = startAngle + anglePer

        const drawHighlight = (show) => {
          vctx.clearRect(0, 0, sizeLocal, sizeLocal)
          vctx.save()
          vctx.translate(sizeLocal / 2, sizeLocal / 2)
          vctx.rotate(totalTarget)
          vctx.drawImage(offscreenRef.current, -sizeLocal / 2, -sizeLocal / 2, sizeLocal, sizeLocal)
          if (show) {
            vctx.beginPath()
            vctx.moveTo(0, 0)
            vctx.arc(0, 0, radius, startAngle, endAngle)
            vctx.closePath()
            vctx.fillStyle = 'rgba(255,255,255,0.45)'
            vctx.fill()
            vctx.strokeStyle = 'rgba(255,69,58,0.9)'
            vctx.lineWidth = Math.max(2, sizeLocal * 0.006)
            vctx.stroke()
          }
          vctx.restore()
        }

        for (let i = 0; i < blinkCount; i++) {
          const id = setTimeout(() => {
            try { drawHighlight(i % 2 === 0) } catch (e) {}
          }, i * blinkInterval)
          blinkTimersRef.current.push(id)
        }

        const endId = setTimeout(() => {
          try { drawHighlight(false) } catch (e) {}
          // hide the pointer label when the wheel is at rest
          try { if (pointerLabelRef.current) pointerLabelRef.current.style.visibility = 'hidden' } catch (e) {}
          try { onSpinEnd?.(finalIdx) } catch (err) { console.error(err) }
          blinkTimersRef.current = []
        }, blinkCount * blinkInterval + 80)
        blinkTimersRef.current.push(endId)
      }
    }

    rafRef.current = requestAnimationFrame(render)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      animationRef.current.running = false
      // clear any pending blink timers
      try {
        (blinkTimersRef.current || []).forEach(id => clearTimeout(id))
      } catch (e) {}
      blinkTimersRef.current = []
      // ensure pointer label hidden when cleaning up
      try { if (pointerLabelRef.current) pointerLabelRef.current.style.visibility = 'hidden' } catch (e) {}
    }
  }, [winningIndex, items, onSpinEnd, cfg.duration, cfg.dprMax, rotations, size])

  // Puntero estilo
  const pointerStyle = {
    position: 'absolute',
    top: -6,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 0,
    height: 0,
    borderLeft: '14px solid transparent',
    borderRight: '14px solid transparent',
    borderTop: `${pointerSize}px solid #ef4444`,
    zIndex: 10,
    pointerEvents: 'none',
  }

  const pointerLabelStyle = {
    position: 'absolute',
    top: pointerSize + 4,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'white',
    padding: '6px 10px',
    borderRadius: 8,
    boxShadow: '0 4px 10px rgba(0,0,0,0.12)',
    fontSize: 14,
    zIndex: 20,
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
    maxWidth: Math.max(80, size * 0.6),
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
     
     
      <canvas ref={canvasRef} style={{ display: 'block' }} aria-hidden="true" />
      <div style={pointerStyle} aria-hidden="true" />
      <div ref={pointerLabelRef} style={pointerLabelStyle} aria-hidden="true" />
    </div>
  )
}

import type { ChangeEvent, CSSProperties } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import hologramUrl from './assets/kira.png'
import { encodeUltraHDR } from './ultrahdr'

type EditorMode = 'pen' | 'stamp' | 'effect'
type PenType = 'plain' | 'heart' | 'star'
type StampType = 'heart' | 'star'
type EffectType = 'hologram'

const DRAW_LAYER_PREVIEW_OPACITY = 0.7

const drawStar = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  outerRadius: number,
  innerRadius: number,
  rotation: number,
) => {
  context.beginPath()
  for (let point = 0; point < 10; point += 1) {
    const radius = point % 2 === 0 ? outerRadius : innerRadius
    const angle = rotation + (Math.PI / 5) * point - Math.PI / 2
    const px = x + Math.cos(angle) * radius
    const py = y + Math.sin(angle) * radius
    if (point === 0) {
      context.moveTo(px, py)
    } else {
      context.lineTo(px, py)
    }
  }
  context.closePath()
  context.fill()
}

function App() {
  const [imageName, setImageName] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [undoCount, setUndoCount] = useState(0)
  const [editorMode, setEditorMode] = useState<EditorMode>('pen')
  const [penSize, setPenSize] = useState(20)
  const [stampSize, setStampSize] = useState(44)
  const [penType, setPenType] = useState<PenType>('plain')
  const [stampType, setStampType] = useState<StampType>('heart')
  const [effectType, setEffectType] = useState<EffectType>('hologram')
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number } | null>(null)
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const heartImageRef = useRef<HTMLImageElement | null>(null)
  const undoStackRef = useRef<ImageData[]>([])
  const isDrawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const hologramCacheRef = useRef<{
    width: number
    height: number
    data: Uint8ClampedArray
  } | null>(null)

  const hasImage = useMemo(() => {
    const canvas = baseCanvasRef.current
    return canvas !== null && canvas.width > 0 && canvas.height > 0
  }, [imageName])

  const revokePreviewUrl = useCallback((nextUrl: string | null) => {
    setPreviewUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl)
      }
      return nextUrl
    })
  }, [])

  const loadImage = useCallback(async (file: File) => {
    const imageUrl = URL.createObjectURL(file)
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('画像の読み込みに失敗しました。'))
      image.src = imageUrl
    })
    URL.revokeObjectURL(imageUrl)
    return image
  }, [])

  const loadImageFromUrl = useCallback(async (url: string) => {
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('ホログラム画像の読み込みに失敗しました。'))
      image.src = url
    })
    return image
  }, [])

  const loadHologramPattern = useCallback(
    async (width: number, height: number) => {
      const cached = hologramCacheRef.current
      if (cached && cached.width === width && cached.height === height) {
        return cached.data
      }
      const image = await loadImageFromUrl(hologramUrl)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) {
        throw new Error('ホログラム描画用のキャンバスが作成できません。')
      }
      const tileSize = Math.min(width, height)
      for (let y = 0; y < height; y += tileSize) {
        for (let x = 0; x < width; x += tileSize) {
          context.drawImage(image, x, y, tileSize, tileSize)
        }
      }
      const patternData = context.getImageData(0, 0, width, height).data
      const cachedData = new Uint8ClampedArray(patternData)
      hologramCacheRef.current = { width, height, data: cachedData }
      return cachedData
    },
    [loadImageFromUrl],
  )

  const resetCanvases = useCallback((width: number, height: number) => {
    const baseCanvas = baseCanvasRef.current
    const drawCanvas = drawCanvasRef.current
    if (!baseCanvas || !drawCanvas) return
    baseCanvas.width = width
    baseCanvas.height = height
    drawCanvas.width = width
    drawCanvas.height = height
    const drawContext = drawCanvas.getContext('2d')
    if (drawContext) {
      drawContext.clearRect(0, 0, width, height)
    }
    setCanvasSize({ width, height })
  }, [])

  const clearUndoHistory = useCallback(() => {
    undoStackRef.current = []
    setUndoCount(0)
  }, [])

  const pushUndoSnapshot = useCallback(() => {
    const drawCanvas = drawCanvasRef.current
    if (!drawCanvas) return
    const context = drawCanvas.getContext('2d')
    if (!context) return
    const snapshot = context.getImageData(0, 0, drawCanvas.width, drawCanvas.height)
    const nextStack = [...undoStackRef.current, snapshot]
    if (nextStack.length > 3) {
      nextStack.shift()
    }
    undoStackRef.current = nextStack
    setUndoCount(nextStack.length)
  }, [])

  const handleUndo = useCallback(() => {
    const drawCanvas = drawCanvasRef.current
    if (!drawCanvas) return
    const context = drawCanvas.getContext('2d')
    if (!context) return
    const previous = undoStackRef.current.at(-1)
    if (!previous) return
    context.putImageData(previous, 0, 0)
    undoStackRef.current = undoStackRef.current.slice(0, -1)
    setUndoCount(undoStackRef.current.length)
    revokePreviewUrl(null)
  }, [revokePreviewUrl])

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return
      event.target.value = ''
      setError(null)
      revokePreviewUrl(null)
      try {
        const image = await loadImage(file)
        resetCanvases(image.width, image.height)
        clearUndoHistory()
        const baseCanvas = baseCanvasRef.current
        const baseContext = baseCanvas?.getContext('2d')
        if (!baseContext) {
          throw new Error('ベース画像の描画に失敗しました。')
        }
        baseContext.clearRect(0, 0, image.width, image.height)
        baseContext.drawImage(image, 0, 0)
        setImageName(file.name)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '画像の読み込みに失敗しました。')
        setCanvasSize(null)
      }
    },
    [clearUndoHistory, loadImage, resetCanvases, revokePreviewUrl],
  )

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const canvasStackStyle = useMemo<CSSProperties | undefined>(() => {
    if (!canvasSize) return undefined
    return {
      aspectRatio: `${canvasSize.width} / ${canvasSize.height}`,
    }
  }, [canvasSize])

  const sizeBounds = useMemo(() => {
    if (!canvasSize) {
      return {
        min: 4,
        max: 150,
      }
    }
    const min = Math.max(1, Math.round(canvasSize.width / 200))
    const max = Math.max(min, Math.round(canvasSize.width / 2))
    return { min, max }
  }, [canvasSize])

  useEffect(() => {
    if (!canvasSize) return
    const defaultPenSize = Math.min(
      sizeBounds.max,
      Math.max(sizeBounds.min, Math.round(canvasSize.width / 40)),
    )
    const defaultStampSize = Math.min(
      sizeBounds.max,
      Math.max(sizeBounds.min, Math.round(canvasSize.width / 10)),
    )
    setPenSize(defaultPenSize)
    setStampSize(defaultStampSize)
  }, [canvasSize, sizeBounds])

  const getCanvasPoint = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    }
  }, [])

  useEffect(() => {
    const image = new Image()
    image.src = `${import.meta.env.BASE_URL}heart.svg`
    heartImageRef.current = image
  }, [])

  const drawPenStroke = useCallback(
    (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const drawCanvas = drawCanvasRef.current
      const context = drawCanvas?.getContext('2d')
      if (!context) return
      context.strokeStyle = 'rgba(255, 255, 255, 0.96)'
      context.lineWidth = penSize
      context.lineCap = 'round'
      context.lineJoin = 'round'
      context.beginPath()
      context.moveTo(from.x, from.y)
      context.lineTo(to.x, to.y)
      context.stroke()
    },
    [penSize],
  )

  const drawHeartPenStroke = useCallback(
    (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const drawCanvas = drawCanvasRef.current
      const context = drawCanvas?.getContext('2d')
      const heartImage = heartImageRef.current
      if (!context || !heartImage?.complete || heartImage.naturalWidth === 0 || heartImage.naturalHeight === 0) {
        return
      }
      const spacing = Math.max(4, penSize * 0.36)
      const distance = Math.hypot(to.x - from.x, to.y - from.y)
      const steps = Math.max(1, Math.ceil(distance / spacing))
      const particleCount = Math.min(5, Math.max(2, Math.round(penSize / 20)))
      const spread = penSize * 0.65
      const aspect = heartImage.naturalHeight / heartImage.naturalWidth
      context.save()
      for (let step = 0; step <= steps; step += 1) {
        const ratio = step / steps
        const x = from.x + (to.x - from.x) * ratio
        const y = from.y + (to.y - from.y) * ratio
        for (let particle = 0; particle < particleCount; particle += 1) {
          const angle = Math.random() * Math.PI * 2
          const distanceScale = Math.sqrt(Math.random()) * spread
          const px = x + Math.cos(angle) * distanceScale
          const py = y + Math.sin(angle) * distanceScale
          const sizeScale = 0.18 + Math.random() * 0.82
          const drawWidth = penSize * sizeScale
          const drawHeight = drawWidth * aspect
          context.globalAlpha = 0.35 + Math.random() * 0.55
          context.drawImage(
            heartImage,
            px - drawWidth / 2,
            py - drawHeight / 2,
            drawWidth,
            drawHeight,
          )
        }
      }
      context.restore()
    },
    [penSize],
  )

  const drawStarPenStroke = useCallback(
    (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const drawCanvas = drawCanvasRef.current
      const context = drawCanvas?.getContext('2d')
      if (!context) return
      const spacing = Math.max(6, penSize * 0.42)
      const distance = Math.hypot(to.x - from.x, to.y - from.y)
      const steps = Math.max(1, Math.ceil(distance / spacing))
      const particleCount = Math.min(4, Math.max(1, Math.round(penSize / 24)))
      const spread = penSize * 0.48
      context.save()
      context.fillStyle = 'rgba(255, 255, 255, 0.94)'
      for (let step = 0; step <= steps; step += 1) {
        const ratio = step / steps
        const x = from.x + (to.x - from.x) * ratio
        const y = from.y + (to.y - from.y) * ratio
        for (let particle = 0; particle < particleCount; particle += 1) {
          const angle = Math.random() * Math.PI * 2
          const distanceScale = Math.sqrt(Math.random()) * spread
          const px = x + Math.cos(angle) * distanceScale
          const py = y + Math.sin(angle) * distanceScale
          const sizeScale = 0.22 + Math.random() * 0.68
          const outerRadius = (penSize * sizeScale) / 2
          context.globalAlpha = 0.35 + Math.random() * 0.55
          drawStar(
            context,
            px,
            py,
            outerRadius,
            outerRadius * 0.45,
            Math.random() * Math.PI,
          )
        }
      }
      context.restore()
    },
    [penSize],
  )

  const drawDecorativePenStroke = useCallback(
    (from: { x: number; y: number }, to: { x: number; y: number }) => {
      if (penType === 'heart') {
        drawHeartPenStroke(from, to)
        return
      }
      drawStarPenStroke(from, to)
    },
    [drawHeartPenStroke, drawStarPenStroke, penType],
  )

  const stampHeartAtPoint = useCallback(
    (point: { x: number; y: number }) => {
      const drawCanvas = drawCanvasRef.current
      const context = drawCanvas?.getContext('2d')
      const heartImage = heartImageRef.current
      if (!context || !heartImage?.complete || heartImage.naturalWidth === 0 || heartImage.naturalHeight === 0) {
        return
      }
      const aspect = heartImage.naturalHeight / heartImage.naturalWidth
      const drawWidth = stampSize
      const drawHeight = drawWidth * aspect
      context.save()
      context.globalAlpha = 0.96
      context.drawImage(
        heartImage,
        point.x - drawWidth / 2,
        point.y - drawHeight / 2,
        drawWidth,
        drawHeight,
      )
      context.restore()
    },
    [stampSize],
  )

  const stampStarAtPoint = useCallback(
    (point: { x: number; y: number }) => {
      const drawCanvas = drawCanvasRef.current
      const context = drawCanvas?.getContext('2d')
      if (!context) return
      context.save()
      context.fillStyle = 'rgba(255, 255, 255, 0.96)'
      drawStar(context, point.x, point.y, stampSize / 2, stampSize * 0.22, 0)
      context.restore()
    },
    [stampSize],
  )

  const stampAtPoint = useCallback(
    (point: { x: number; y: number }) => {
      if (stampType === 'heart') {
        stampHeartAtPoint(point)
        return
      }
      stampStarAtPoint(point)
    },
    [stampHeartAtPoint, stampStarAtPoint, stampType],
  )

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!hasImage) return
      const point = getCanvasPoint(event)
      if (!point) return
      if (editorMode === 'stamp') {
        pushUndoSnapshot()
        stampAtPoint(point)
        return
      }
      if (editorMode !== 'pen') return
      pushUndoSnapshot()
      isDrawingRef.current = true
      lastPointRef.current = point
      if (penType !== 'plain') {
        drawDecorativePenStroke(point, point)
      }
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [drawDecorativePenStroke, editorMode, getCanvasPoint, hasImage, penType, pushUndoSnapshot, stampAtPoint],
  )

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current) return
      const point = getCanvasPoint(event)
      const lastPoint = lastPointRef.current
      if (!point || !lastPoint) return
      if (editorMode === 'pen' && penType === 'plain') {
        drawPenStroke(lastPoint, point)
      } else if (editorMode === 'pen') {
        drawDecorativePenStroke(lastPoint, point)
      }
      lastPointRef.current = point
    },
    [drawDecorativePenStroke, drawPenStroke, editorMode, getCanvasPoint, penType],
  )

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    lastPointRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }, [])

  const handleClear = useCallback(() => {
    const drawCanvas = drawCanvasRef.current
    if (!drawCanvas) return
    const context = drawCanvas.getContext('2d')
    if (!context) return
    pushUndoSnapshot()
    context.clearRect(0, 0, drawCanvas.width, drawCanvas.height)
    revokePreviewUrl(null)
  }, [pushUndoSnapshot, revokePreviewUrl])

  const buildGainmap = useCallback(() => {
    const drawCanvas = drawCanvasRef.current
    if (!drawCanvas) return null
    const context = drawCanvas.getContext('2d')
    if (!context) return null
    const drawData = context.getImageData(0, 0, drawCanvas.width, drawCanvas.height)
    const output = new Uint8ClampedArray(drawData.data.length)
    const { width, height } = drawCanvas
    for (let index = 0; index < drawData.data.length; index += 4) {
      const alpha = drawData.data[index + 3]
      const value = Math.round(alpha)
      output[index] = value
      output[index + 1] = value
      output[index + 2] = value
      output[index + 3] = 255
    }
    return new ImageData(output, width, height)
  }, [])

  const applyHologramPattern = useCallback(async () => {
    const drawCanvas = drawCanvasRef.current
    if (!drawCanvas) return
    const context = drawCanvas.getContext('2d')
    if (!context) return
    const drawData = context.getImageData(0, 0, drawCanvas.width, drawCanvas.height)
    const patternData = await loadHologramPattern(drawCanvas.width, drawCanvas.height)
    for (let index = 0; index < drawData.data.length; index += 4) {
      const alpha = drawData.data[index + 3]
      const pattern =
        (patternData[index] + patternData[index + 1] + patternData[index + 2]) /
        (3 * 255)
      const contrasted = Math.min(1, Math.max(0, (pattern - 0.3) / 0.7))
      const shaped = Math.pow(contrasted, 2.6)
      const intensity = Math.min(255, Math.round(255 * Math.min(1, shaped * 2.5)))
      const baseAlpha = alpha / 255
      const hologramAlpha = 0.2 + Math.min(1, shaped * 2) * 0.8
      drawData.data[index] = intensity
      drawData.data[index + 1] = intensity
      drawData.data[index + 2] = intensity
      drawData.data[index + 3] = Math.round(255 * Math.max(baseAlpha, hologramAlpha))
    }
    context.putImageData(drawData, 0, 0)
    revokePreviewUrl(null)
  }, [loadHologramPattern, revokePreviewUrl])

  const handleModeSelect = useCallback((nextMode: EditorMode) => {
    setEditorMode(nextMode)
    setError(null)
  }, [])

  const handleEffectSelect = useCallback(
    async (nextEffect: EffectType) => {
      setEffectType(nextEffect)
      setError(null)
      if (!hasImage) return
      try {
        if (nextEffect === 'hologram') {
          pushUndoSnapshot()
          await applyHologramPattern()
        }
      } catch (effectError) {
        setError(
          effectError instanceof Error
            ? effectError.message
            : 'エフェクトの反映に失敗しました。',
        )
      }
    },
    [applyHologramPattern, hasImage, pushUndoSnapshot],
  )

  const handleGenerate = useCallback(async () => {
    const baseCanvas = baseCanvasRef.current
    if (!baseCanvas) return
    const baseContext = baseCanvas.getContext('2d')
    if (!baseContext) return
    const gainmap = buildGainmap()
    if (!gainmap) return
    setError(null)
    setIsGenerating(true)
    revokePreviewUrl(null)
    try {
      const baseImage = baseContext.getImageData(0, 0, baseCanvas.width, baseCanvas.height)
      const blob = await encodeUltraHDR(baseImage, gainmap)
      const nextUrl = URL.createObjectURL(blob)
      revokePreviewUrl(nextUrl)
    } catch (encodeError) {
      setError(
        encodeError instanceof Error
          ? encodeError.message
          : 'UltraHDRの生成に失敗しました。',
      )
    } finally {
      setIsGenerating(false)
    }
  }, [buildGainmap, revokePreviewUrl])

  return (
    <div className="app">
      <input
        ref={fileInputRef}
        className="hidden-input"
        type="file"
        accept="image/*"
        onChange={handleFileChange}
      />

      <header className="app__header">
        <h1>キラデコメーカー</h1>
      </header>

      <section className="image-area">
        <div className={`canvas-stack${hasImage ? ' canvas-stack--ready' : ''}`} style={canvasStackStyle}>
          <canvas ref={baseCanvasRef} className="canvas" />
          <canvas
            ref={drawCanvasRef}
            className="canvas canvas--draw"
            style={{ opacity: DRAW_LAYER_PREVIEW_OPACITY }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
          {!hasImage && (
            <button type="button" className="canvas-upload" onClick={openFilePicker}>
              <span className="canvas-upload__icon" aria-hidden="true">
                +
              </span>
              <span className="canvas-upload__label">画像をえらぶ</span>
            </button>
          )}
        </div>
        <div className="image-area__meta">
          <p className="image-area__name">{imageName ?? '画像はまだ読み込まれていません'}</p>
        </div>
      </section>

      <section className="control-board">
        <div className="control-panel control-panel--mode">
          <button type="button" className="mode-button mode-button--action" onClick={openFilePicker}>
            <img
              className="mode-button__icon"
              src={`${import.meta.env.BASE_URL}image.svg`}
              alt=""
              aria-hidden="true"
            />
            <span className="mode-button__label">よみこみ</span>
          </button>
          <button
            type="button"
            className={`mode-button${editorMode === 'pen' ? ' mode-button--active' : ''}`}
            onClick={() => {
              handleModeSelect('pen')
            }}
          >
            <img className="mode-button__icon" src={`${import.meta.env.BASE_URL}pen.svg`} alt="" aria-hidden="true" />
            <span className="mode-button__label">ペン</span>
          </button>
          <button
            type="button"
            className={`mode-button${editorMode === 'stamp' ? ' mode-button--active' : ''}`}
            onClick={() => {
              handleModeSelect('stamp')
            }}
          >
            <img className="mode-button__icon" src={`${import.meta.env.BASE_URL}stamp.svg`} alt="" aria-hidden="true" />
            <span className="mode-button__label">スタンプ</span>
          </button>
          <button
            type="button"
            className={`mode-button${editorMode === 'effect' ? ' mode-button--active' : ''}`}
            onClick={() => {
              handleModeSelect('effect')
            }}
            disabled={!hasImage}
          >
            <img className="mode-button__icon" src={`${import.meta.env.BASE_URL}effect.svg`} alt="" aria-hidden="true" />
            <span className="mode-button__label">エフェクト</span>
          </button>
          <button
            type="button"
            className="mode-button mode-button--action"
            onClick={handleClear}
            disabled={!hasImage}
          >
            <img
              className="mode-button__icon"
              src={`${import.meta.env.BASE_URL}clear.svg`}
              alt=""
              aria-hidden="true"
            />
            <span className="mode-button__label">クリア</span>
          </button>
          <button
            type="button"
            className="mode-button mode-button--action"
            onClick={handleUndo}
            disabled={!hasImage || undoCount === 0}
          >
            <span className="mode-button__label">Undo</span>
          </button>
          <button
            type="button"
            className="mode-button mode-button--action mode-button--primary"
            onClick={handleGenerate}
            disabled={!hasImage || isGenerating}
          >
            <img
              className="mode-button__icon"
              src={`${import.meta.env.BASE_URL}generate.svg`}
              alt=""
              aria-hidden="true"
            />
            <span className="mode-button__label">
              {isGenerating ? 'さくせい中' : 'さくせい'}
            </span>
          </button>
        </div>

        <div className="control-panel control-panel--detail">
          {editorMode === 'pen' && (
            <>
              <label className="control-range">
                <span>線の太さ</span>
                <input
                  type="range"
                  min={sizeBounds.min}
                  max={sizeBounds.max}
                  value={penSize}
                  onChange={(event) => setPenSize(Number(event.target.value))}
                />
                <strong>{penSize}px</strong>
              </label>
              <fieldset className="choice-group">
                <legend>ペンの種類</legend>
                <label
                  className={
                    penType === 'plain'
                      ? 'choice-group__option choice-group__option--active'
                      : 'choice-group__option'
                  }
                >
                  <input
                    type="radio"
                    name="penType"
                    value="plain"
                    checked={penType === 'plain'}
                    onChange={() => setPenType('plain')}
                  />
                  <span>線</span>
                </label>
                <label
                  className={
                    penType === 'heart'
                      ? 'choice-group__option choice-group__option--active'
                      : 'choice-group__option'
                  }
                >
                  <input
                    type="radio"
                    name="penType"
                    value="heart"
                    checked={penType === 'heart'}
                    onChange={() => setPenType('heart')}
                  />
                  <span>ハート</span>
                </label>
                <label
                  className={
                    penType === 'star'
                      ? 'choice-group__option choice-group__option--active'
                      : 'choice-group__option'
                  }
                >
                  <input
                    type="radio"
                    name="penType"
                    value="star"
                    checked={penType === 'star'}
                    onChange={() => setPenType('star')}
                  />
                  <span>スター</span>
                </label>
              </fieldset>
            </>
          )}

          {editorMode === 'stamp' && (
            <>
              <label className="control-range">
                <span>スタンプの大きさ</span>
                <input
                  type="range"
                  min={sizeBounds.min}
                  max={sizeBounds.max}
                  value={stampSize}
                  onChange={(event) => setStampSize(Number(event.target.value))}
                />
                <strong>{stampSize}px</strong>
              </label>
              <fieldset className="choice-group">
                <legend>スタンプの種類</legend>
                <label
                  className={
                    stampType === 'heart'
                      ? 'choice-group__option choice-group__option--active'
                      : 'choice-group__option'
                  }
                >
                  <input
                    type="radio"
                    name="stampType"
                    value="heart"
                    checked={stampType === 'heart'}
                    onChange={() => setStampType('heart')}
                  />
                  <span>ハート</span>
                </label>
                <label
                  className={
                    stampType === 'star'
                      ? 'choice-group__option choice-group__option--active'
                      : 'choice-group__option'
                  }
                >
                  <input
                    type="radio"
                    name="stampType"
                    value="star"
                    checked={stampType === 'star'}
                    onChange={() => setStampType('star')}
                  />
                  <span>スター</span>
                </label>
              </fieldset>
            </>
          )}

          {editorMode === 'effect' && (
            <fieldset className="choice-group">
              <legend>エフェクト</legend>
              <button
                type="button"
                className={
                  effectType === 'hologram'
                    ? 'choice-group__action choice-group__action--active'
                    : 'choice-group__action'
                }
                onClick={() => {
                  void handleEffectSelect('hologram')
                }}
                disabled={!hasImage}
              >
                <img
                  className="choice-group__icon"
                  src={`${import.meta.env.BASE_URL}kira.svg`}
                  alt=""
                  aria-hidden="true"
                />
                <span>ホログラム</span>
              </button>
            </fieldset>
          )}
        </div>
      </section>

      {error && <p className="error">{error}</p>}

      {previewUrl && (
        <div
          className="preview-modal"
          role="dialog"
          aria-modal="true"
          aria-label="生成プレビュー"
          onClick={() => revokePreviewUrl(null)}
        >
          <div className="preview-modal__panel" onClick={(event) => event.stopPropagation()}>
            <div className="preview-modal__header">
              <h2>できあがりプレビュー</h2>
              <button type="button" className="subtle-button" onClick={() => revokePreviewUrl(null)}>
                とじる
              </button>
            </div>
            <img className="preview-modal__image" src={previewUrl} alt="生成された画像のプレビュー" />
          </div>
        </div>
      )}
    </div>
  )
}

export default App

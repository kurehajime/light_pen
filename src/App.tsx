import type { ChangeEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import './App.css'
import { encodeUltraHDR } from './ultrahdr'
import hologramUrl from './assets/kira.png'

type StrokeType = 'line' | 'heart'
const DRAW_LAYER_PREVIEW_OPACITY = 0.7

function App() {
  const [imageName, setImageName] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [brushSize, setBrushSize] = useState(16)
  const [strokeType, setStrokeType] = useState<StrokeType>('line')
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number } | null>(null)
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const heartImageRef = useRef<HTMLImageElement | null>(null)
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
    [loadImage, resetCanvases, revokePreviewUrl],
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

  const drawStroke = useCallback(
    (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const drawCanvas = drawCanvasRef.current
      const context = drawCanvas?.getContext('2d')
      if (!context) return
      if (strokeType === 'line') {
        context.strokeStyle = 'rgba(255, 255, 255, 0.95)'
        context.lineWidth = brushSize
        context.lineCap = 'round'
        context.lineJoin = 'round'
        context.beginPath()
        context.moveTo(from.x, from.y)
        context.lineTo(to.x, to.y)
        context.stroke()
        return
      }
      const heartImage = heartImageRef.current
      if (!heartImage?.complete || heartImage.naturalWidth === 0 || heartImage.naturalHeight === 0) {
        return
      }
      const spacing = Math.max(2, brushSize * 0.35)
      const deltaX = to.x - from.x
      const deltaY = to.y - from.y
      const distance = Math.hypot(deltaX, deltaY)
      const steps = Math.max(1, Math.ceil(distance / spacing))
      const particleCount = Math.min(4, Math.max(1, Math.round(brushSize / 10)))
      const spread = brushSize * 1
      const aspect = heartImage.naturalHeight / heartImage.naturalWidth
      context.save()
      for (let step = 0; step <= steps; step += 1) {
        const ratio = step / steps
        const x = from.x + deltaX * ratio
        const y = from.y + deltaY * ratio
        for (let particle = 0; particle < particleCount; particle += 1) {
          const angle = Math.random() * Math.PI * 2
          const distanceScale = Math.sqrt(Math.random()) * spread
          const px = x + Math.cos(angle) * distanceScale
          const py = y + Math.sin(angle) * distanceScale
          const sizeScale = 0.1 + Math.random() * 0.8
          const drawWidth = brushSize * sizeScale
          const drawHeight = drawWidth * aspect
          context.globalAlpha = 0.25 + Math.random() * 0.7
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
    [brushSize, strokeType],
  )

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!hasImage) return
      const point = getCanvasPoint(event)
      if (!point) return
      isDrawingRef.current = true
      lastPointRef.current = point
      if (strokeType === 'heart') {
        drawStroke(point, point)
      }
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [drawStroke, getCanvasPoint, hasImage, strokeType],
  )

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current) return
      const point = getCanvasPoint(event)
      const lastPoint = lastPointRef.current
      if (!point || !lastPoint) return
      drawStroke(lastPoint, point)
      lastPointRef.current = point
    },
    [drawStroke, getCanvasPoint],
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
    context.clearRect(0, 0, drawCanvas.width, drawCanvas.height)
    revokePreviewUrl(null)
  }, [revokePreviewUrl])

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
  }, [loadHologramPattern])

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
      <header className="app__header">
        <div>
          <h1>Light Pen UltraHDR</h1>
          <p className="app__subtitle">
            画像を読み込んで線を引き、UltraHDRで書き出します。
          </p>
        </div>
        <label className="file">
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} />
          <span>画像をアップロード</span>
        </label>
      </header>

      <section className="workspace">
        <div className="workspace__canvas">
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
                <span className="canvas-upload__label">画像をアップロード</span>
              </button>
            )}
          </div>
          {!hasImage && <p className="hint">画像を選択するとキャンバスが表示されます。</p>}
        </div>

        <aside className="workspace__controls">
          <div className="panel">
            <h2>描画設定</h2>
            <label className="slider">
              <span>ペンの太さ</span>
              <input
                type="range"
                min={4}
                max={150}
                value={brushSize}
                onChange={(event) => setBrushSize(Number(event.target.value))}
              />
              <strong>{brushSize}px</strong>
            </label>
            <fieldset className="tool-picker">
              <legend>線の種類</legend>
              <label>
                <input
                  type="radio"
                  name="strokeType"
                  value="line"
                  checked={strokeType === 'line'}
                  onChange={() => setStrokeType('line')}
                />
                <span>線</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="strokeType"
                  value="heart"
                  checked={strokeType === 'heart'}
                  onChange={() => setStrokeType('heart')}
                />
                <span>ハート</span>
              </label>
            </fieldset>
            <button type="button" onClick={applyHologramPattern} disabled={!hasImage || isGenerating}>
              ホログラムを線に反映
            </button>
            <button type="button" onClick={handleClear} disabled={!hasImage}>
              線をクリア
            </button>
          </div>

          <div className="panel">
            <h2>UltraHDR</h2>
            <p className="panel__hint">線にホログラム模様を適用して輝度を作ります。</p>
            <button type="button" onClick={handleGenerate} disabled={!hasImage || isGenerating}>
              {isGenerating ? '生成中…' : 'UltraHDRを生成'}
            </button>
            {previewUrl && (
              <img className="preview" src={previewUrl} alt="UltraHDR preview" />
            )}
            {error && <p className="error">{error}</p>}
          </div>
        </aside>
      </section>
    </div>
  )
}

export default App

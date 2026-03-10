import type { ChangeEvent, CSSProperties } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import hologramUrl from './assets/kira.png'
import { encodeUltraHDR } from './ultrahdr'

type EditorMode = 'pen' | 'stamp' | 'hologram'
type PenType = 'plain' | 'marker'
type StampType = 'heart' | 'star'

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
  const [editorMode, setEditorMode] = useState<EditorMode>('pen')
  const [penSize, setPenSize] = useState(20)
  const [stampSize, setStampSize] = useState(44)
  const [penType, setPenType] = useState<PenType>('plain')
  const [stampType, setStampType] = useState<StampType>('heart')
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

  const drawPenStroke = useCallback(
    (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const drawCanvas = drawCanvasRef.current
      const context = drawCanvas?.getContext('2d')
      if (!context) return
      context.strokeStyle =
        penType === 'marker' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.96)'
      context.lineWidth = penType === 'marker' ? penSize * 1.2 : penSize
      context.lineCap = 'round'
      context.lineJoin = 'round'
      context.beginPath()
      context.moveTo(from.x, from.y)
      context.lineTo(to.x, to.y)
      context.stroke()
    },
    [penSize, penType],
  )

  const drawHeartStampStroke = useCallback(
    (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const drawCanvas = drawCanvasRef.current
      const context = drawCanvas?.getContext('2d')
      const heartImage = heartImageRef.current
      if (!context || !heartImage?.complete || heartImage.naturalWidth === 0 || heartImage.naturalHeight === 0) {
        return
      }
      const spacing = Math.max(4, stampSize * 0.36)
      const distance = Math.hypot(to.x - from.x, to.y - from.y)
      const steps = Math.max(1, Math.ceil(distance / spacing))
      const particleCount = Math.min(5, Math.max(2, Math.round(stampSize / 20)))
      const spread = stampSize * 0.65
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
          const drawWidth = stampSize * sizeScale
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
    [stampSize],
  )

  const drawStarStampStroke = useCallback(
    (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const drawCanvas = drawCanvasRef.current
      const context = drawCanvas?.getContext('2d')
      if (!context) return
      const spacing = Math.max(6, stampSize * 0.42)
      const distance = Math.hypot(to.x - from.x, to.y - from.y)
      const steps = Math.max(1, Math.ceil(distance / spacing))
      const particleCount = Math.min(4, Math.max(1, Math.round(stampSize / 24)))
      const spread = stampSize * 0.48
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
          const outerRadius = (stampSize * sizeScale) / 2
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
    [stampSize],
  )

  const drawStampStroke = useCallback(
    (from: { x: number; y: number }, to: { x: number; y: number }) => {
      if (stampType === 'heart') {
        drawHeartStampStroke(from, to)
        return
      }
      drawStarStampStroke(from, to)
    },
    [drawHeartStampStroke, drawStarStampStroke, stampType],
  )

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!hasImage || editorMode === 'hologram') return
      const point = getCanvasPoint(event)
      if (!point) return
      isDrawingRef.current = true
      lastPointRef.current = point
      if (editorMode === 'stamp') {
        drawStampStroke(point, point)
      }
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [drawStampStroke, editorMode, getCanvasPoint, hasImage],
  )

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current) return
      const point = getCanvasPoint(event)
      const lastPoint = lastPointRef.current
      if (!point || !lastPoint) return
      if (editorMode === 'pen') {
        drawPenStroke(lastPoint, point)
      } else if (editorMode === 'stamp') {
        drawStampStroke(lastPoint, point)
      }
      lastPointRef.current = point
    },
    [drawPenStroke, drawStampStroke, editorMode, getCanvasPoint],
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
    revokePreviewUrl(null)
  }, [loadHologramPattern, revokePreviewUrl])

  const handleModeSelect = useCallback(
    async (nextMode: EditorMode) => {
      setEditorMode(nextMode)
      setError(null)
      if (nextMode !== 'hologram' || !hasImage) return
      try {
        await applyHologramPattern()
      } catch (hologramError) {
        setError(
          hologramError instanceof Error
            ? hologramError.message
            : 'ホログラムの反映に失敗しました。',
        )
      }
    },
    [applyHologramPattern, hasImage],
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
          {hasImage && (
            <button type="button" className="subtle-button" onClick={handleClear}>
              クリア
            </button>
          )}
        </div>
      </section>

      <section className="control-board">
        <button type="button" className="side-action side-action--left" onClick={openFilePicker}>
          <span className="side-action__kana">画像</span>
          <span className="side-action__label">よみこみ</span>
        </button>

        <div className="control-panel control-panel--mode">
          <button
            type="button"
            className={`mode-button${editorMode === 'pen' ? ' mode-button--active' : ''}`}
            onClick={() => {
              void handleModeSelect('pen')
            }}
          >
            ペン
          </button>
          <button
            type="button"
            className={`mode-button${editorMode === 'stamp' ? ' mode-button--active' : ''}`}
            onClick={() => {
              void handleModeSelect('stamp')
            }}
          >
            スタンプ
          </button>
          <button
            type="button"
            className={`mode-button${editorMode === 'hologram' ? ' mode-button--active' : ''}`}
            onClick={() => {
              void handleModeSelect('hologram')
            }}
            disabled={!hasImage}
          >
            ホログラム
          </button>
        </div>

        <button
          type="button"
          className="side-action side-action--right side-action--primary"
          onClick={handleGenerate}
          disabled={!hasImage || isGenerating}
        >
          <span className="side-action__kana">画像</span>
          <span className="side-action__label">
            {isGenerating ? 'さくせい中' : 'さくせい'}
          </span>
        </button>

        <div className="control-panel control-panel--detail">
          {editorMode === 'pen' && (
            <>
              <label className="control-range">
                <span>線の太さ</span>
                <input
                  type="range"
                  min={4}
                  max={150}
                  value={penSize}
                  onChange={(event) => setPenSize(Number(event.target.value))}
                />
                <strong>{penSize}px</strong>
              </label>
              <fieldset className="choice-group">
                <legend>ペンの種類</legend>
                <label className={penType === 'plain' ? 'choice-group__option choice-group__option--active' : 'choice-group__option'}>
                  <input
                    type="radio"
                    name="penType"
                    value="plain"
                    checked={penType === 'plain'}
                    onChange={() => setPenType('plain')}
                  />
                  <span>ノーマル</span>
                </label>
                <label className={penType === 'marker' ? 'choice-group__option choice-group__option--active' : 'choice-group__option'}>
                  <input
                    type="radio"
                    name="penType"
                    value="marker"
                    checked={penType === 'marker'}
                    onChange={() => setPenType('marker')}
                  />
                  <span>マーカー</span>
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
                  min={12}
                  max={150}
                  value={stampSize}
                  onChange={(event) => setStampSize(Number(event.target.value))}
                />
                <strong>{stampSize}px</strong>
              </label>
              <fieldset className="choice-group">
                <legend>スタンプの種類</legend>
                <label className={stampType === 'heart' ? 'choice-group__option choice-group__option--active' : 'choice-group__option'}>
                  <input
                    type="radio"
                    name="stampType"
                    value="heart"
                    checked={stampType === 'heart'}
                    onChange={() => setStampType('heart')}
                  />
                  <span>ハート</span>
                </label>
                <label className={stampType === 'star' ? 'choice-group__option choice-group__option--active' : 'choice-group__option'}>
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

          {editorMode === 'hologram' && (
            <div className="control-empty">
              <p>追加設定はありません</p>
              <small>上のボタンを押したタイミングでホログラムを反映します。</small>
            </div>
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

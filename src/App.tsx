import type { ChangeEvent } from 'react'
import { useCallback, useMemo, useRef, useState } from 'react'
import './App.css'
import { encodeUltraHDR } from './ultrahdr'

function App() {
  const [imageName, setImageName] = useState<string | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [brushSize, setBrushSize] = useState(16)
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDrawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)

  const hasImage = useMemo(() => {
    const canvas = baseCanvasRef.current
    return canvas !== null && canvas.width > 0 && canvas.height > 0
  }, [imageName])

  const revokeDownloadUrl = useCallback((nextUrl: string | null) => {
    setDownloadUrl((currentUrl) => {
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
  }, [])

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return
      setError(null)
      revokeDownloadUrl(null)
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
      }
    },
    [loadImage, resetCanvases, revokeDownloadUrl],
  )

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

  const drawStroke = useCallback(
    (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const drawCanvas = drawCanvasRef.current
      const context = drawCanvas?.getContext('2d')
      if (!context) return
      context.strokeStyle = 'rgba(255, 255, 255, 0.95)'
      context.lineWidth = brushSize
      context.lineCap = 'round'
      context.lineJoin = 'round'
      context.beginPath()
      context.moveTo(from.x, from.y)
      context.lineTo(to.x, to.y)
      context.stroke()
    },
    [brushSize],
  )

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!hasImage) return
      const point = getCanvasPoint(event)
      if (!point) return
      isDrawingRef.current = true
      lastPointRef.current = point
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [getCanvasPoint, hasImage],
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
    revokeDownloadUrl(null)
  }, [revokeDownloadUrl])

  const buildGainmap = useCallback(() => {
    const drawCanvas = drawCanvasRef.current
    if (!drawCanvas) return null
    const context = drawCanvas.getContext('2d')
    if (!context) return null
    const drawData = context.getImageData(0, 0, drawCanvas.width, drawCanvas.height)
    const output = new Uint8ClampedArray(drawData.data.length)
    for (let index = 0; index < drawData.data.length; index += 4) {
      const alpha = drawData.data[index + 3]
      output[index] = alpha
      output[index + 1] = alpha
      output[index + 2] = alpha
      output[index + 3] = 255
    }
    return new ImageData(output, drawCanvas.width, drawCanvas.height)
  }, [])

  const handleGenerate = useCallback(async () => {
    const baseCanvas = baseCanvasRef.current
    if (!baseCanvas) return
    const baseContext = baseCanvas.getContext('2d')
    if (!baseContext) return
    const gainmap = buildGainmap()
    if (!gainmap) return
    setError(null)
    setIsGenerating(true)
    revokeDownloadUrl(null)
    try {
      const baseImage = baseContext.getImageData(0, 0, baseCanvas.width, baseCanvas.height)
      const blob = await encodeUltraHDR(baseImage, gainmap)
      revokeDownloadUrl(URL.createObjectURL(blob))
    } catch (encodeError) {
      setError(
        encodeError instanceof Error
          ? encodeError.message
          : 'UltraHDRの生成に失敗しました。',
      )
    } finally {
      setIsGenerating(false)
    }
  }, [buildGainmap, revokeDownloadUrl])

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
          <input type="file" accept="image/*" onChange={handleFileChange} />
          <span>画像をアップロード</span>
        </label>
      </header>

      <section className="workspace">
        <div className="workspace__canvas">
          <div className="canvas-stack">
            <canvas ref={baseCanvasRef} className="canvas" />
            <canvas
              ref={drawCanvasRef}
              className="canvas canvas--draw"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />
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
                max={48}
                value={brushSize}
                onChange={(event) => setBrushSize(Number(event.target.value))}
              />
              <strong>{brushSize}px</strong>
            </label>
            <button type="button" onClick={handleClear} disabled={!hasImage}>
              線をクリア
            </button>
          </div>

          <div className="panel">
            <h2>UltraHDR</h2>
            <p className="panel__hint">
              UltraHDR生成後、ダウンロードリンクが表示されます。
            </p>
            <button type="button" onClick={handleGenerate} disabled={!hasImage || isGenerating}>
              {isGenerating ? '生成中…' : 'UltraHDRを生成'}
            </button>
            {downloadUrl && (
              <a
                className="download"
                href={downloadUrl}
                download={imageName ? imageName.replace(/\.[^.]+$/, '') + '-ultrahdr.jpg' : 'ultrahdr.jpg'}
              >
                UltraHDRをダウンロード
              </a>
            )}
            {error && <p className="error">{error}</p>}
          </div>
        </aside>
      </section>
    </div>
  )
}

export default App

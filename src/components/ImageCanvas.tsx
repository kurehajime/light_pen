import type { CSSProperties, PointerEventHandler, RefObject } from 'react'
import { ImageIntro } from './ImageIntro'

type ImageCanvasProps = {
  baseCanvasRef: RefObject<HTMLCanvasElement | null>
  canvasStackStyle?: CSSProperties
  drawCanvasRef: RefObject<HTMLCanvasElement | null>
  hasImage: boolean
  onOpenFilePicker: () => void
  onPointerDown: PointerEventHandler<HTMLCanvasElement>
  onPointerMove: PointerEventHandler<HTMLCanvasElement>
  onPointerUp: PointerEventHandler<HTMLCanvasElement>
  previewOpacity: number
}

export function ImageCanvas({
  baseCanvasRef,
  canvasStackStyle,
  drawCanvasRef,
  hasImage,
  onOpenFilePicker,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  previewOpacity,
}: ImageCanvasProps) {
  return (
    <section className="image-area">
      <div
        className={`canvas-stack${hasImage ? ' canvas-stack--ready' : ' canvas-stack--intro'}`}
        style={canvasStackStyle}
      >
        <canvas ref={baseCanvasRef} className="canvas" />
        <canvas
          ref={drawCanvasRef}
          className="canvas canvas--draw"
          style={{ opacity: previewOpacity }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
        {!hasImage && (
          <div className="canvas-intro-layer">
            <ImageIntro onOpenFilePicker={onOpenFilePicker} />
          </div>
        )}
      </div>
    </section>
  )
}

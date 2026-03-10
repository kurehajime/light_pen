import { useMemo, useState } from 'react'

type PreviewModalProps = {
  previewUrl: string | null
  onClose: () => void
}

export function PreviewModal({ previewUrl, onClose }: PreviewModalProps) {
  const [isSharing, setIsSharing] = useState(false)

  const canShare = useMemo(
    () => typeof navigator !== 'undefined' && typeof navigator.share === 'function',
    [],
  )

  if (!previewUrl) return null

  const handleShare = async () => {
    if (!canShare || isSharing) return
    setIsSharing(true)
    try {
      const response = await fetch(previewUrl)
      const blob = await response.blob()
      const file = new File([blob], 'kiradeco-maker.jpg', {
        type: blob.type || 'image/jpeg',
      })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'キラデコメーカー',
        })
      } else {
        await navigator.share({
          title: 'キラデコメーカー',
          text: 'キラデコメーカーで作成した画像です。',
        })
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        console.error(error)
      }
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <div
      className="preview-modal"
      role="dialog"
      aria-modal="true"
      aria-label="生成プレビュー"
      onClick={onClose}
    >
      <div className="preview-modal__panel" onClick={(event) => event.stopPropagation()}>
        <div className="preview-modal__header">
          <button type="button" className="subtle-button" onClick={onClose}>
            とじる
          </button>
          <h2>できあがりプレビュー</h2>
          <button
            type="button"
            className="subtle-button subtle-button--share"
            onClick={() => {
              void handleShare()
            }}
            disabled={!canShare || isSharing}
          >
            <img
              className="subtle-button__icon"
              src={`${import.meta.env.BASE_URL}share.svg`}
              alt=""
              aria-hidden="true"
            />
            <span>{isSharing ? 'シェア中' : 'シェアする'}</span>
          </button>
        </div>
        <img className="preview-modal__image" src={previewUrl} alt="生成された画像のプレビュー" />
      </div>
    </div>
  )
}

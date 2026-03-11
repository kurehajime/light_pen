import type { Dispatch, SetStateAction } from 'react'
import type { EditorMode, EffectType, PenType, StampType } from '../editorTypes'
import type { SizeBounds } from '../lib/editorSizing'

type ControlBoardProps = {
  editorMode: EditorMode
  effectType: EffectType
  hasImage: boolean
  isGenerating: boolean
  onEffectSelect: (nextEffect: EffectType) => Promise<void>
  onGenerate: () => void
  onModeSelect: (nextMode: EditorMode) => void
  onOpenFilePicker: () => void
  onUndo: () => void
  penSize: number
  penType: PenType
  setPenSize: Dispatch<SetStateAction<number>>
  setPenType: Dispatch<SetStateAction<PenType>>
  setStampSize: Dispatch<SetStateAction<number>>
  setStampType: Dispatch<SetStateAction<StampType>>
  sizeBounds: SizeBounds
  stampSize: number
  stampType: StampType
  undoCount: number
}

export function ControlBoard({
  editorMode,
  effectType,
  hasImage,
  isGenerating,
  onEffectSelect,
  onGenerate,
  onModeSelect,
  onOpenFilePicker,
  onUndo,
  penSize,
  penType,
  setPenSize,
  setPenType,
  setStampSize,
  setStampType,
  sizeBounds,
  stampSize,
  stampType,
  undoCount,
}: ControlBoardProps) {
  return (
    <section className="control-board">
      <div className="control-panel control-panel--mode">
        <button
          type="button"
          className={`mode-button mode-button--action${!hasImage ? ' mode-button--action-emphasis' : ''}`}
          onClick={onOpenFilePicker}
        >
          <img
            className="mode-button__icon"
            src={`${import.meta.env.BASE_URL}image.svg`}
            alt=""
            aria-hidden="true"
          />
          <span className="mode-button__label">読込</span>
        </button>
        <div className="mode-button-cluster" role="group" aria-label="編集モード">
          <button
            type="button"
            className={`mode-button mode-button--joined mode-button--joined-start${editorMode === 'pen' ? ' mode-button--active' : ''}`}
            onClick={() => {
              onModeSelect('pen')
            }}
          >
            <img
              className="mode-button__icon"
              src={`${import.meta.env.BASE_URL}pen.svg`}
              alt=""
              aria-hidden="true"
            />
            <span className="mode-button__label">ペン</span>
          </button>
          <button
            type="button"
            className={`mode-button mode-button--joined${editorMode === 'stamp' ? ' mode-button--active' : ''}`}
            onClick={() => {
              onModeSelect('stamp')
            }}
          >
            <img
              className="mode-button__icon"
              src={`${import.meta.env.BASE_URL}stamp.svg`}
              alt=""
              aria-hidden="true"
            />
            <span className="mode-button__label">判子</span>
          </button>
          <button
            type="button"
            className={`mode-button mode-button--joined mode-button--joined-end${editorMode === 'effect' ? ' mode-button--active' : ''}`}
            onClick={() => {
              onModeSelect('effect')
            }}
          >
            <img
              className="mode-button__icon"
              src={`${import.meta.env.BASE_URL}effect.svg`}
              alt=""
              aria-hidden="true"
            />
            <span className="mode-button__label">効果</span>
          </button>
        </div>
        <button
          type="button"
          className="mode-button mode-button--action"
          onClick={onUndo}
          disabled={!hasImage || undoCount === 0}
        >
          <img
            className="mode-button__icon"
            src={`${import.meta.env.BASE_URL}undo.svg`}
            alt=""
            aria-hidden="true"
          />
          <span className="mode-button__label">戻す</span>
        </button>
        <button
          type="button"
          className={`mode-button mode-button--action mode-button--primary${hasImage && !isGenerating ? ' mode-button--action-emphasis' : ''}`}
          onClick={onGenerate}
          disabled={!hasImage || isGenerating}
        >
          <img
            className="mode-button__icon"
            src={`${import.meta.env.BASE_URL}generate.svg`}
            alt=""
            aria-hidden="true"
          />
          <span className="mode-button__label">{isGenerating ? '作成中' : '作成'}</span>
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
                void onEffectSelect('hologram')
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
  )
}

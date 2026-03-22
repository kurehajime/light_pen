import type { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import type { EditorMode, EffectType, PenType, StampType } from '../editorTypes'
import { CheckIcon, EffectIcon, HeartIcon, ImageIcon, KiraIcon, PenIcon, StampIcon, StarIcon, UndoIcon } from '../icons'
import type { SizeBounds } from '../lib/editorSizing'

type ControlBoardProps = {
  editorMode: EditorMode
  effectType: EffectType
  hasImage: boolean
  isGenerating: boolean
  isGenerateMenuOpen: boolean
  onEffectSelect: (nextEffect: EffectType) => Promise<void>
  onGenerate: () => void
  onGenerateX: () => void
  onGenerateMenuToggle: () => void
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
  isGenerateMenuOpen,
  onEffectSelect,
  onGenerate,
  onGenerateX,
  onGenerateMenuToggle,
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
  const { t } = useTranslation()
  const detailViewKey = isGenerateMenuOpen ? 'generate' : editorMode

  return (
    <section className="control-board">
      <div className="control-panel control-panel--mode">
        <button
          type="button"
          className="mode-button mode-button--action"
          onClick={onOpenFilePicker}
        >
          <ImageIcon className="mode-button__icon" aria-hidden="true" />
          <span className="mode-button__label">{t('controls.open')}</span>
        </button>
        <div className="mode-button-cluster" role="group" aria-label={t('controls.modesAriaLabel')}>
          <button
            type="button"
            className={`mode-button mode-button--joined mode-button--joined-start${!isGenerateMenuOpen && editorMode === 'pen' ? ' mode-button--active' : ''}`}
            onClick={() => {
              onModeSelect('pen')
            }}
          >
            <PenIcon className="mode-button__icon" aria-hidden="true" />
            <span className="mode-button__label">{t('controls.pen')}</span>
          </button>
          <button
            type="button"
            className={`mode-button mode-button--joined${!isGenerateMenuOpen && editorMode === 'stamp' ? ' mode-button--active' : ''}`}
            onClick={() => {
              onModeSelect('stamp')
            }}
          >
            <StampIcon className="mode-button__icon" aria-hidden="true" />
            <span className="mode-button__label">{t('controls.stamp')}</span>
          </button>
          <button
            type="button"
            className={`mode-button mode-button--joined mode-button--joined-end${!isGenerateMenuOpen && editorMode === 'effect' ? ' mode-button--active' : ''}`}
            onClick={() => {
              onModeSelect('effect')
            }}
          >
            <EffectIcon className="mode-button__icon" aria-hidden="true" />
            <span className="mode-button__label">{t('controls.effect')}</span>
          </button>
        </div>
        <button
          type="button"
          className="mode-button mode-button--action"
          onClick={onUndo}
          disabled={!hasImage || undoCount === 0}
        >
          <UndoIcon className="mode-button__icon" aria-hidden="true" />
          <span className="mode-button__label">{t('controls.undo')}</span>
        </button>
        <button
          type="button"
          className={`mode-button mode-button--action mode-button--primary${hasImage && !isGenerating ? ' mode-button--action-emphasis' : ''}${isGenerateMenuOpen ? ' mode-button--active' : ''}`}
          onClick={onGenerateMenuToggle}
          disabled={!hasImage || isGenerating}
          aria-expanded={isGenerateMenuOpen}
          aria-controls="generate-menu"
        >
          <CheckIcon className="mode-button__icon" aria-hidden="true" />
          <span className="mode-button__label">
            {isGenerating ? t('controls.generating') : t('controls.generate')}
          </span>
        </button>
      </div>

      <div className="control-panel control-panel--detail">
        <div key={detailViewKey} className="control-panel__detail-content">
          {isGenerateMenuOpen ? (
            <fieldset
              id="generate-menu"
              className="choice-group"
              aria-label={t('controls.generateOptionsAriaLabel')}
            >
              <legend>{t('controls.generateOptionsAriaLabel')}</legend>
              <button
                type="button"
                className="choice-group__action choice-group__action--primary"
                onClick={onGenerate}
              >
                <ImageIcon className="choice-group__icon" aria-hidden="true" />
                <span>{t('controls.generateImage')}</span>
              </button>
              <button
                type="button"
                className="choice-group__action"
                onClick={onGenerateX}
              >
                <ImageIcon className="choice-group__icon" aria-hidden="true" />
                <span>{t('controls.generateXImage')}</span>
              </button>
            </fieldset>
          ) : editorMode === 'pen' ? (
            <>
              <label className="control-range">
                <span>{t('controls.penSize')}</span>
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
                <legend>{t('controls.penType')}</legend>
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
                  <PenIcon className="choice-group__option-icon" aria-hidden="true" />
                  <span>{t('controls.plain')}</span>
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
                  <HeartIcon className="choice-group__option-icon" aria-hidden="true" />
                  <span>{t('controls.heart')}</span>
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
                  <StarIcon className="choice-group__option-icon" aria-hidden="true" />
                  <span>{t('controls.star')}</span>
                </label>
              </fieldset>
            </>
          ) : editorMode === 'stamp' ? (
            <>
              <label className="control-range">
                <span>{t('controls.stampSize')}</span>
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
                <legend>{t('controls.stampType')}</legend>
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
                  <HeartIcon className="choice-group__option-icon" aria-hidden="true" />
                  <span>{t('controls.heart')}</span>
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
                  <StarIcon className="choice-group__option-icon" aria-hidden="true" />
                  <span>{t('controls.star')}</span>
                </label>
              </fieldset>
            </>
          ) : (
            <fieldset className="choice-group">
              <legend>{t('controls.effects')}</legend>
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
                <KiraIcon className="choice-group__icon" aria-hidden="true" />
                <span>{t('controls.hologram')}</span>
              </button>
            </fieldset>
          )}
        </div>
      </div>

      <a
        className="control-board__credit"
        href="https://github.com/kurehajime"
        target="_blank"
        rel="noreferrer"
      >
        by kurehajime
      </a>
    </section>
  )
}

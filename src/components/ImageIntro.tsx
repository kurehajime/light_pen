type ImageIntroProps = {
  isHdrSupported: boolean | null
  onOpenFilePicker: () => void
}

export function ImageIntro({ isHdrSupported, onOpenFilePicker }: ImageIntroProps) {
  const assetBase = import.meta.env.BASE_URL

  return (
    <div className="image-intro">
      <p className="image-intro__lead">キラキラ写真を作ろう！</p>

      <div className="image-intro__examples" aria-label="ビフォーアフターのイメージ">
        <figure className="image-intro__card">
          <img className="image-intro__image" src={`${assetBase}before.jpg`} alt="加工前のサンプル画像" />
          <figcaption className="image-intro__caption">元写真</figcaption>
        </figure>

        <span className="image-intro__arrow" aria-hidden="true" />

        <div className="image-intro__after-group">
          <figure className="image-intro__card image-intro__card--after">
            <img className="image-intro__image" src={`${assetBase}after1.jpg`} alt="加工後のサンプル画像 1" />
            <figcaption className="image-intro__caption">ホログラム加工</figcaption>
          </figure>
          <figure className="image-intro__card image-intro__card--after">
            <img className="image-intro__image" src={`${assetBase}after2.jpg`} alt="加工後のサンプル画像 2" />
            <figcaption className="image-intro__caption">好きにデコれる！</figcaption>
          </figure>
        </div>
      </div>

      {isHdrSupported === false && (
        <p className="image-intro__notice">※あなたの表示端末はキラキラ画像の表示(HDR)に対応していないようです。iPhone等で開いてみてください</p>
      )}

      <button type="button" className="image-intro__button" onClick={onOpenFilePicker}>
        <span className="image-intro__button-icon" aria-hidden="true">
          <img src={`${assetBase}image.svg`} alt="" />
        </span>
        <span className="image-intro__button-label">画像をえらぶ</span>
      </button>
    </div>
  )
}

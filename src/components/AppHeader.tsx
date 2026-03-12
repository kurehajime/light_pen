export function AppHeader() {
  return (
    <header className="app__header">
      <div className="app__title">
        <img className="app__title-icon" src={`${import.meta.env.BASE_URL}logo.jpeg`} alt="" aria-hidden="true" />
        <h1>キラデコメーカー</h1>
      </div>
    </header>
  )
}

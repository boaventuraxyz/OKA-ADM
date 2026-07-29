export default function AdminLoading() {
  return (
    <div aria-label="Carregando conteúdo" aria-live="polite" className="page-loading">
      <div className="loading-heading">
        <span className="loading-block loading-title" />
        <span className="loading-block loading-button" />
      </div>
      <div className="panel loading-panel">
        <span className="loading-block loading-row" />
        <span className="loading-block loading-row" />
        <span className="loading-block loading-row" />
      </div>
      <span className="sr-only">Carregando...</span>
    </div>
  );
}

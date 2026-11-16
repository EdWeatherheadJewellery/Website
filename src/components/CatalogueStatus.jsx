import './CatalogueStatus.css';

// Shown in place of product content while the catalogue is loading, or if it
// couldn't be loaded. Renders nothing once products are ready.
export default function CatalogueStatus({ status, onRetry }) {
  if (status === 'ready') return null;

  if (status === 'error') {
    return (
      <div className="catalogue-status" role="alert">
        <p>We couldn&rsquo;t load the shop just now. Please check your connection and try again.</p>
        <button type="button" className="catalogue-status-retry" onClick={onRetry}>Try again</button>
      </div>
    );
  }

  return <p className="catalogue-status" role="status">Loading&hellip;</p>;
}

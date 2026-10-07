export default function Loading() {
  return (
    <main className="container page-space" aria-busy="true" aria-label="Loading page">
      <div className="skeleton" style={{ height: 120, marginBottom: 24 }} />
      <div className="product-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton" style={{ height: 320 }} />
        ))}
      </div>
    </main>
  );
}

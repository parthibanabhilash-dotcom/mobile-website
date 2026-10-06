export default function Loading() {
  return (
    <main className="container page-space" aria-label="Loading content" aria-busy="true">
      <div className="skeleton" style={{ height: 300, marginBottom: 32 }} />
      <div className="product-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton" style={{ height: 380 }} />
        ))}
      </div>
    </main>
  );
}

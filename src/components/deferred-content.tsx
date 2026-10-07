'use client';
import { useEffect, useRef, useState, startTransition, type ReactNode } from 'react';
export function DeferredContent({ children, count = 4 }: { children: ReactNode; count?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          startTransition(() => setVisible(true));
          observer.disconnect();
        }
      },
      { rootMargin: '150px' },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref}>
      {visible ? (
        children
      ) : (
        <div className="product-grid" role="region" aria-busy="true" aria-label="Loading products">
          {Array.from({ length: count }, (_, i) => (
            <div key={i} className="skeleton" style={{ height: 360 }} />
          ))}
        </div>
      )}
    </div>
  );
}

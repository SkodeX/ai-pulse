import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

/** Unteres Panel (Handy) bzw. schwebendes Panel (Desktop) – aus Space */
export function Sheet({ title, onClose, children }: { title: ReactNode; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <section className="sheet" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}>
        <header className="sheet-head">
          <h2 className="sheet-title">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Schließen"><X size={18} /></button>
        </header>
        <div className="sheet-body">{children}</div>
      </section>
    </>
  );
}

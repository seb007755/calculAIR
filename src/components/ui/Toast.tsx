import { useEffect } from 'react';
import { create } from 'zustand';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import styles from './Toast.module.css';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  kind: ToastKind;
  message: string;
}

interface ToastState {
  toasts: ToastItem[];
  push: (kind: ToastKind, message: string) => void;
  dismiss: (id: string) => void;
}

const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (kind, message) =>
    set((s) => ({
      toasts: [...s.toasts, { id: Math.random().toString(36).slice(2), kind, message }],
    })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Fire a toast from anywhere (event handlers, async code). */
export const toast = {
  success: (m: string) => useToastStore.getState().push('success', m),
  error: (m: string) => useToastStore.getState().push('error', m),
  info: (m: string) => useToastStore.getState().push('info', m),
};

const icons = {
  success: <CheckCircle2 size={16} />,
  error: <AlertTriangle size={16} />,
  info: <Info size={16} />,
};

function ToastRow({ item }: { item: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismiss);
  useEffect(() => {
    const t = setTimeout(() => dismiss(item.id), 4000);
    return () => clearTimeout(t);
  }, [item.id, dismiss]);

  return (
    <div className={[styles.toast, styles[item.kind]].join(' ')} role="status">
      <span className={styles.icon}>{icons[item.kind]}</span>
      <span className={styles.msg}>{item.message}</span>
      <button className={styles.close} onClick={() => dismiss(item.id)} aria-label="Schließen">
        <X size={14} />
      </button>
    </div>
  );
}

/** Mount once near the app root. */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div className={styles.stack}>
      {toasts.map((t) => (
        <ToastRow key={t.id} item={t} />
      ))}
    </div>
  );
}

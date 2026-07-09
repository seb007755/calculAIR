import type { ReactNode } from 'react';
import { Header } from './Header';
import styles from './AppShell.module.css';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <Header />
      <main className={styles.content}>{children}</main>
    </div>
  );
}

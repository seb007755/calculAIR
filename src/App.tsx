import { AppShell } from './components/layout/AppShell';
import { AppRoutes } from './router';
import { Toaster } from './components/ui/Toast';

export function App() {
  return (
    <AppShell>
      <AppRoutes />
      <Toaster />
    </AppShell>
  );
}

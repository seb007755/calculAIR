import { Navigate, Route, Routes } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { FormulaEditorPage } from './pages/FormulaEditorPage';
import { IngredientsPage } from './pages/IngredientsPage';
import { SettingsPage } from './pages/SettingsPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/formula/:id" element={<FormulaEditorPage />} />
      <Route path="/ingredients" element={<IngredientsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

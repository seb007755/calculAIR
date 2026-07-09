import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './styles/tokens.css';
import './styles/fonts.css';
import './styles/global.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* HashRouter is mandatory for GitHub Pages deep links. */}
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);

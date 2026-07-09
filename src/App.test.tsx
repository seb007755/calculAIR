import { describe, it, expect, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { HashRouter } from 'react-router-dom';
import { StrictMode } from 'react';
import { App } from './App';
import { useStore, defaultSettings } from './store/useStore';

// Full-tree render smoke tests: verify the app mounts and routes render
// without throwing, exercising store + router + layout + pages.

let container: HTMLDivElement | null = null;
let root: Root | null = null;

async function render(hash = '#/') {
  window.location.hash = hash;
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container!);
    root.render(
      <StrictMode>
        <HashRouter>
          <App />
        </HashRouter>
      </StrictMode>,
    );
  });
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = null;
  root = null;
  useStore.setState({ ingredients: [], formulas: [], settings: { ...defaultSettings } });
});

describe('App — render smoke', () => {
  it('mounts the shell with brand + navigation', async () => {
    await render('#/');
    const text = document.body.textContent ?? '';
    expect(text).toContain('Parfum Rezeptur');
    expect(text).toContain('Rezepturen');
    expect(text).toContain('Duftstoffe');
    expect(text).toContain('Einstellungen');
  });

  it('dashboard shows the empty state when there is no data', async () => {
    await render('#/');
    expect(document.body.textContent ?? '').toContain('Noch keine Rezepturen');
  });

  it('dashboard lists a formula after seeding', async () => {
    useStore.getState().loadSeed();
    await render('#/');
    expect(document.body.textContent ?? '').toContain('Vetiver Study #3');
  });

  it('ingredients page renders the seeded library', async () => {
    useStore.getState().loadSeed();
    await render('#/ingredients');
    const text = document.body.textContent ?? '';
    expect(text).toContain('Iso E Super');
    expect(text).toContain('Ethanol 96%');
  });

  it('settings page renders data + defaults sections', async () => {
    await render('#/settings');
    const text = document.body.textContent ?? '';
    expect(text).toContain('Daten sichern');
    expect(text).toContain('Standardwerte');
  });

  it('formula editor renders summary metrics for a seeded formula', async () => {
    useStore.getState().loadSeed();
    const id = useStore.getState().formulas[0].id;
    await render(`#/formula/${id}`);
    const text = document.body.textContent ?? '';
    expect(text).toContain('Gesamtmenge');
    expect(text).toContain('Duftpyramide');
    // 19.00 g total mass, de-DE formatted
    expect(text).toContain('19,00');
  });
});

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/app';
import { PlatformProvider } from './platform/context';
import { ErrorBoundary } from './shared/error-boundary';
import { DialogProvider } from './shared/dialog';
import './shared/tokens.css';
import './app/styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <PlatformProvider>
          <DialogProvider>
            <App />
          </DialogProvider>
        </PlatformProvider>
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
);

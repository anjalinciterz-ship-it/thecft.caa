import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './lib/auth';
import { AppearanceProvider } from './lib/appearance';
import { BlogProvider } from './lib/blog';
import { CatalogProvider } from './lib/catalog';
import './styles/global.css';
import './styles/appearance.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppearanceProvider>
      <BrowserRouter>
        <AuthProvider>
          <CatalogProvider>
            <BlogProvider>
              <App />
            </BlogProvider>
          </CatalogProvider>
        </AuthProvider>
      </BrowserRouter>
    </AppearanceProvider>
  </React.StrictMode>,
);

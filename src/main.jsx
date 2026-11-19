import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './lib/auth';
import { BlogProvider } from './lib/blog';
import { CatalogProvider } from './lib/catalog';
import './styles/fonts.css';
import './styles/global.css';
import './styles/appearance.css';

/* One appearance, cosmic blue: index.html declares data-theme="dark" and the
   night layer in appearance.css paints from there. There is no visitor choice
   to read, so nothing runs before the first paint. */
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CatalogProvider>
          <BlogProvider>
            <App />
          </BlogProvider>
        </CatalogProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

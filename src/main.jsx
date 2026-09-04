import React from 'react';
import { createRoot } from 'react-dom/client';
import MainApp from './MainApp';
import { I18nProvider } from './i18n';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <I18nProvider>
      <MainApp />
    </I18nProvider>
  </React.StrictMode>
);

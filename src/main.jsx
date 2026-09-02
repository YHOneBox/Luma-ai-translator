import React from 'react';
import { createRoot } from 'react-dom/client';
import MainApp from './MainApp';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MainApp />
  </React.StrictMode>
);

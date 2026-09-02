import React from 'react';
import { createRoot } from 'react-dom/client';
import RegionSelector from './RegionSelector';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RegionSelector />
  </React.StrictMode>
);

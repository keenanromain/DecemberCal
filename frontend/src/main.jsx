import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

function start() {
  const root = document.getElementById('root');
  if (!root) throw new Error("Root element not found");

  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// Wait for DOM to be fully parsed
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}


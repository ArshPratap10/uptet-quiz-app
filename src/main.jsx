import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Service Worker registration for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(err => {
      console.log('Service Worker registration failed:', err);
    });
  });
}

// Check for saved dark mode preference before initial render
const savedDarkMode = localStorage.getItem('darkMode');
if (savedDarkMode === 'true') {
  document.documentElement.setAttribute('data-theme', 'dark');
} else {
  document.documentElement.removeAttribute('data-theme');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
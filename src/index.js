import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import './style.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => console.log('Service Worker registered:', reg.scope))
      .catch(err => console.error('SW registration failed:', err));
  });
}

ReactDOM.render(<App />, document.getElementById('root'));

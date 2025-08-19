import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Suppress benign AbortError from interrupted media play() promises in Chrome
window.addEventListener('unhandledrejection', (event) => {
  const reason: any = event.reason;
  const message = typeof reason?.message === 'string' ? reason.message : '';
  if (
    (reason?.name === 'AbortError' || reason instanceof DOMException) &&
    message.includes('The play() request was interrupted by a call to pause()')
  ) {
    event.preventDefault();
  }
});

createRoot(document.getElementById("root")!).render(<App />);

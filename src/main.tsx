import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Defer non-critical initialization
requestIdleCallback(() => {
  import('./utils/security').then(m => m.SecurityUtils.cleanupLocalStorage());
  import('./utils/privacy').then(m => m.PrivacyUtils.initializePrivacyProtection());
}, { timeout: 5000 });

const container = document.getElementById("root")!;
createRoot(container).render(<App />);

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx'
// v2: setGlobalStyles() was removed (MIGRATION.md §9). The global utility/layout
// classes (.al-l-*, .al-u-*) and base token defaults now ship as a static
// stylesheet, and theming is a scoped <al-theme> host set up below.
import 'al-web-components/css/main.css';
import 'al-web-components/components/theme';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <al-theme brand="altitude" mode="light">
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </al-theme>
  </React.StrictMode>,
)

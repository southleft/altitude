import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import { ALTheme } from '@southleft/al-react';
import App from './App.jsx'
// v2: setGlobalStyles() was removed (MIGRATION.md §9). The global utility/layout
// classes (.al-l-*, .al-u-*) and base token defaults now ship as a static
// stylesheet, and theming is a scoped <al-theme> host set up below. The `ALTheme`
// wrapper registers the version-suffixed element and reflects the axis props
// (brand/mode/...) to attributes itself — see libs/al-react/src/components/Theme.
import '@southleft/al-web-components/css/main.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ALTheme brand="altitude" mode="light">
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ALTheme>
  </React.StrictMode>,
)

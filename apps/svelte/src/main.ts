import './app.css'
import { mount } from 'svelte'
import App from './App.svelte'
// v2: setGlobalStyles() was removed (MIGRATION.md §9). The global utility/layout
// classes (.al-l-*, .al-u-*) and base token defaults now ship as a static
// stylesheet, and theming is a scoped <al-theme> host (see App.svelte).
import 'al-web-components/css/main.css';
import 'al-web-components/components/theme';

const app = mount(App, {
  target: document.getElementById('app')!,
});

export default app

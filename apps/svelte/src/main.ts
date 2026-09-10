import './app.css'
import { mount } from 'svelte'
import App from './App.svelte'
// v2: setGlobalStyles() was removed (MIGRATION.md §9). The global utility/layout
// classes (.al-l-*, .al-u-*) and base token defaults now ship as a static
// stylesheet, and theming is a scoped <al-theme> host (see App.svelte).
import '@southleft/al-web-components/css/main.css';
// The design system's own token bundle. `css/main.css` carries the reset, the
// cascade layers, the base element styles and the utilities; the PALETTE lives
// here, one file per system, `:root` plus `[data-al-mode='...']`. Nothing sets
// `brand` any more -- this page is Altitude because it loaded Altitude's tokens.
import '@southleft/al-web-components/project/altitude.css';
import '@southleft/al-web-components/components/theme';

const app = mount(App, {
  target: document.getElementById('app')!,
});

export default app

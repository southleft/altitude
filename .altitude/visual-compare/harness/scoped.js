import { ALTheme } from '../../../libs/al-web-components/dist/components/bundle/bundle.js';
import { registerAltitude } from '../../../libs/al-web-components/dist/directives/register.js';
class ALThemeVersioned extends ALTheme {}
registerAltitude({ mode: 'versioned', suffix: '9-9-9' }, [[ALTheme.el, ALThemeVersioned]]);
const content = '<div class="surface"><al-button>Action</al-button><al-card>Scoped content</al-card></div>';
const column = (id, attrs, tag = 'al-theme') => `<${tag} data-probe="${id}" ${attrs}>${content}</${tag}>`;
document.getElementById('axes').innerHTML = [
  column('dark', 'mode="dark"'),
  column('light', 'mode="light"'),
  column('motion-reduced', 'mode="dark" motion="reduced"'),
  column('versioned', 'mode="light"', 'al-theme-9-9-9'),
  `<al-theme data-probe="outer" mode="dark">${content}<al-theme data-probe="inner" mode="light">${content}</al-theme></al-theme>`,
].join('');
await Promise.all([...document.querySelectorAll('*')].map(el => el.updateComplete ?? null));
document.documentElement.dataset.ready = 'true';

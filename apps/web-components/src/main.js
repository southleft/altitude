// T0.3 fixture — imports each pilot component so the build verifies the
// public ES module surface of al-web-components.
import 'al-web-components/dist/components/button/button.js';
import 'al-web-components/dist/components/input/input.js';
import 'al-web-components/dist/components/select/select.js';
import 'al-web-components/dist/components/dialog/dialog.js';
import 'al-web-components/dist/components/theme-switcher/theme-switcher.js';

const open = document.getElementById('open');
const dlg = document.getElementById('dlg');
if (open && dlg) {
  open.addEventListener('click', () => {
    if ('show' in dlg) /** @type {any} */ (dlg).show?.();
    else dlg.setAttribute('open', '');
  });
}

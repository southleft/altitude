// T0.3 fixture — imports each pilot component so the build verifies the
// public ES module surface of al-web-components.
//
// `window.alAutoRegistry = true` is set inline in index.html BEFORE this
// module loads. ESM imports are hoisted, so setting the flag here would be
// too late. T4.6 replaces this with the explicit `stable` registry mode.
import 'al-web-components/components/button';
import 'al-web-components/components/input';
import 'al-web-components/components/select';
import 'al-web-components/components/dialog';
import 'al-web-components/components/theme-switcher';

const open = document.getElementById('open');
const dlg = document.getElementById('dlg');
if (open && dlg) {
  open.addEventListener('click', () => {
    if ('show' in dlg) /** @type {any} */ (dlg).show?.();
    else dlg.setAttribute('open', '');
  });
}

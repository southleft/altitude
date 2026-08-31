// T0.3 fixture — imports each pilot component so the build verifies the
// public ES module surface of @southleft/al-web-components.
//
// `window.alAutoRegistry = true` is set inline in index.html BEFORE this
// module loads. ESM imports are hoisted, so setting the flag here would be
// too late. T4.6 replaces this with the explicit `stable` registry mode.
import '@southleft/al-web-components/components/button';
import '@southleft/al-web-components/components/input';
import '@southleft/al-web-components/components/select';
import '@southleft/al-web-components/components/dialog';
import '@southleft/al-web-components/components/theme-switcher';
import '@southleft/al-web-components/components/theme';
import '@southleft/al-web-components/components/layout';
import '@southleft/al-web-components/components/heading';
import '@southleft/al-web-components/components/text-block';
// Not rendered by index.html — imported only so `tests/wrapper-contract.spec.ts`
// can mount them into `document.body` and assert the events their @southleft/al-react
// wrappers map. Adding imports here cannot move a VRT baseline: every screenshot
// in `tests/pilots.vrt.spec.ts` targets a `<section>` that exists in index.html.
import '@southleft/al-web-components/components/checkbox';
import '@southleft/al-web-components/components/checkbox-group';
import '@southleft/al-web-components/components/calendar';

const open = document.getElementById('open');
const dlg = document.getElementById('dlg');
if (open && dlg) {
  open.addEventListener('click', () => {
    if ('show' in dlg) /** @type {any} */ (dlg).show?.();
    else dlg.setAttribute('open', '');
  });
}

// Landing page entry. Vite bundles Lit (and the component runtime deps) in,
// so the deployed page is self-contained — no bare-specifier / import-map
// gymnastics like the old hand-authored static index.html needed.
//
// `window.alAutoRegistry = true` is set inline in index.html BEFORE this
// module loads (ESM imports are hoisted, so setting it here would be too late)
// so each imported component self-registers its custom element.
import 'al-web-components/dist/css/main.css';
import 'al-web-components/dist/components/theme/theme';

import 'al-web-components/dist/components/button/button';
import 'al-web-components/dist/components/card/card';
import 'al-web-components/dist/components/divider/divider';
import 'al-web-components/dist/components/header/header';
import 'al-web-components/dist/components/heading/heading';
import 'al-web-components/dist/components/icon/icons/document';
import 'al-web-components/dist/components/layout-container/layout-container';
import 'al-web-components/dist/components/layout/layout';
import 'al-web-components/dist/components/layout-section/layout-section';
import 'al-web-components/dist/components/logo/logo';
import 'al-web-components/dist/components/tab-panel/tab-panel';
import 'al-web-components/dist/components/tab/tab';
import 'al-web-components/dist/components/tabs/tabs';
import 'al-web-components/dist/components/text-passage/text-passage';

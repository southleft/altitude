// Landing page entry. Vite bundles Lit (and the component runtime deps) in,
// so the deployed page is self-contained — no bare-specifier / import-map
// gymnastics like the old hand-authored static index.html needed.
//
// `window.alAutoRegistry = true` is set inline in index.html BEFORE this
// module loads (ESM imports are hoisted, so setting it here would be too late)
// so each imported component self-registers its custom element.
import 'al-web-components/css/main.css';
import 'al-web-components/components/theme';

import 'al-web-components/components/button';
import 'al-web-components/components/card';
import 'al-web-components/components/divider';
import 'al-web-components/components/header';
import 'al-web-components/components/heading';
import 'al-web-components/components/icon/icons/document';
import 'al-web-components/components/layout-container';
import 'al-web-components/components/layout';
import 'al-web-components/components/layout-section';
import 'al-web-components/components/logo';
import 'al-web-components/components/tab-panel';
import 'al-web-components/components/tab';
import 'al-web-components/components/tabs';
import 'al-web-components/components/text-passage';

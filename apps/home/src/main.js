// Landing page entry. Vite bundles Lit (and the component runtime deps) in,
// so the deployed page is self-contained — no bare-specifier / import-map
// gymnastics like the old hand-authored static index.html needed.
//
// `window.alAutoRegistry = true` is set inline in index.html BEFORE this
// module loads (ESM imports are hoisted, so setting it here would be too late)
// so each imported component self-registers its custom element.
import '@southleft/al-web-components/css/main.css';
import './home.scss';
import '@southleft/al-web-components/components/theme';

import '@southleft/al-web-components/components/layout';
import '@southleft/al-web-components/components/button';
import '@southleft/al-web-components/components/card';
import '@southleft/al-web-components/components/chip';
import '@southleft/al-web-components/components/divider';
import '@southleft/al-web-components/components/footer';
import '@southleft/al-web-components/components/header';
import '@southleft/al-web-components/components/heading';
import '@southleft/al-web-components/components/icon/icon';
import '@southleft/al-web-components/components/icon/icons/success';
import '@southleft/al-web-components/components/link';
import '@southleft/al-web-components/components/list';
import '@southleft/al-web-components/components/list-item';
import '@southleft/al-web-components/components/logo';
import '@southleft/al-web-components/components/stat';
import '@southleft/al-web-components/components/tab-panel';
import '@southleft/al-web-components/components/tab';
import '@southleft/al-web-components/components/tabs';
import '@southleft/al-web-components/components/text-block';

// AI Showcase Homepage (2026-08-20-ai-showcase-homepage) — the "what's
// under the hood" KPI band (R4). Numbers are computed from the repo by
// `scripts/generate-stats.js` (wired into "start"/"build" in package.json)
// rather than hardcoded, so the page can't drift into a false claim as the
// library grows. Each `<al-stat data-stat="…">` in index.html starts with a
// placeholder value; this fills it in once the page has parsed.
import stats from './generated/stats.json';

const STAT_LABELS = {
  components: 'Components',
  presets: 'Theme presets',
  icons: 'Icons',
  tokens: 'Design tokens',
};

function formatCount(n) {
  return new Intl.NumberFormat('en-US').format(n);
}

function applyStats() {
  document.querySelectorAll('[data-stat]').forEach((el) => {
    const key = el.getAttribute('data-stat');
    if (key in stats) {
      el.setAttribute('value', formatCount(stats[key]));
    }
    if (STAT_LABELS[key]) {
      el.setAttribute('label', STAT_LABELS[key]);
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', applyStats);
} else {
  applyStats();
}

import { afterEach, describe, expect, it } from 'vitest';
// Compiled to a CSS string (the rewrite-scss-imports plugin adds `?inline`):
// the exact stylesheet that ships as css/main.css.
import mainCss from './main.scss';

/**
 * Render the global stylesheet into a fresh iframe. The test runner's own
 * document is not a clean page (the runner styles its body), so a UA-default
 * page is the only honest place to observe what main.css does to <body>.
 */
const frames: HTMLIFrameElement[] = [];
async function pageWith(css: string, extraCss = '') {
  const frame = document.createElement('iframe');
  frames.push(frame);
  frame.srcdoc = `<!doctype html><html><head><style>${css}</style><style>${extraCss}</style></head><body><p>x</p></body></html>`;
  const loaded = new Promise((resolve) => frame.addEventListener('load', resolve, { once: true }));
  document.body.append(frame);
  await loaded;
  return frame.contentDocument!;
}

afterEach(() => {
  frames.splice(0).forEach((f) => f.remove());
});

describe('global base styles (css/main.css)', () => {
  it('a bare page has the UA 8px body margin (control)', async () => {
    const doc = await pageWith('');
    expect(getComputedStyle(doc.body).marginTop).toBe('8px');
  });

  it("resets the browser's default body margin", async () => {
    // Without it the UA's 8px body margin inset full-width bars such as
    // al-header and al-footer from the viewport edges.
    const doc = await pageWith(mainCss.toString());
    const cs = getComputedStyle(doc.body);
    expect(cs.marginTop).toBe('0px');
    expect(cs.marginRight).toBe('0px');
    expect(cs.marginBottom).toBe('0px');
    expect(cs.marginLeft).toBe('0px');
  });

  it('keeps the reset overridable by unlayered consumer CSS', async () => {
    // The reset lives in the `al.reset` layer, so any unlayered author rule
    // wins without !important.
    const doc = await pageWith(mainCss.toString(), 'body { margin: 3px; }');
    expect(getComputedStyle(doc.body).marginTop).toBe('3px');
  });
});

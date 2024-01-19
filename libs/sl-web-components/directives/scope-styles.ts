// eslint-disable-next-line import/no-webpack-loader-syntax tslint:disable-next-line
import css from '!!css-loader?{"sourceMap":false,"exportType":"string"}!../dist/sl/sl.css';
/**
 * Function to scope styles to a parent selector
 */
export function scopeStyles(parentSelector: string): string {
  // This regex matches CSS selectors and more
  const regex = /([^{};]+){/g;

  // Prepend the parent selector to each selector in the file
  return css.replace(regex, (match: string): string => {
    // exclude @import, @media, @keyframes, etc.
    if (match.includes('@')) {
      return match;
    }
    // Split multiple selectors (e.g., "h1, h2") and prepend the parent selector to each
    // except for :root, which is replaced with the parent selector
    const selectors = match.split(',').map((selector) => `${parentSelector} ${selector.includes(':root') ? '' : selector.trim().replace('{', '')}`);
    return selectors.join(', ') + '{';
  });
}

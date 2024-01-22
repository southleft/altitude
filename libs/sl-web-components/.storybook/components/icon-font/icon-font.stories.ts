import { html } from 'lit';
import { guard } from 'lit/directives/guard.js';
import './icon-font';

export default {
  title: 'Tokens, Icons, and Utilities/Icons',
  component: 'icon-font',
};

/**
 * Get icon font style.
 */

// Load icon css file as a string
const IconCss = require('!!raw-loader!../../../components/icon/fonts/iconfont.css').default;

// Transform the css string into an array of objects with each icon's name and code
const IconMap = IconCss.match(/\.icon-[^\}]+\}/g).map((icon) => {
  // Check for double or single quotes in the css file
  const iconCode = icon.match(/content: "(.*?)";/) || icon.match(/content: '(.*?)';/)
  return {
    name: icon.match(/\.icon-(.*?):/)[1],
    code: iconCode[1]
  };
});

// Append the icon css string to a style tag at the head of the document
const styleTag = document.createElement('style');
styleTag.type = 'text/javascript';
styleTag.innerHTML = IconCss;

// Iterate throught the Icon Map to render each icon with its name and code to the grid
function renderIconList() {
  return IconMap.map((item) => {
    return html`<li class="icon-grid__item">
      <span class="icon icon-${item.name}"></span>
      <span>
        ${item.name}<br />
        <span style="color: gray">unicode: ${item.code.replace(`\\`, '\\u')}<br />html: ${item.code.replace(`\\`, '&#x') + ';'}</span>
      </span>
    </li>`;
  });
}

export const IconFont = (args, context) =>
  html` ${guard(false, () => html`${styleTag}`)}
    <icon-font> ${renderIconList()} </icon-font>`;

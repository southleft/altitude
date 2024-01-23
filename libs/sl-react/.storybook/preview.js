import headStyles from 'sl-web-components/styles/head.scss';

export const excludeRegexArray = [
  '^children$',
  '^render$',
  '^firstUpdated$',
  '^openAll$',
  '^closeAll$',
  '^componentClassNames$',
  '^slotEmpty$',
  '^slotNotEmpty$',
  '^dispatch$',
  '^renderOptions$',
  '^connectedCallback$',
  '^disconnectedCallback$',
  '^renderRoot$',
  '^isUpdatePending$',
  '^hasUpdated$',
  '^updated$',
  '^addController$',
  '^removeController$',
  '^attributeChangedCallback$',
  '^requestUpdate$',
  '^updateComplete$',
  '^on[A-Z].*',
  '^handle[A-Z].*',
  '^_.*'
];

const headStyleElement = document.createElement('style');
headStyleElement.innerHTML = headStyles;
document.head.appendChild(headStyleElement);

// // // Icon font (Storybook only for docs)
import iconFontCSS from '../../sl-web-components/components/icon/fonts/iconfont.css';
const iconFontStyleElement = document.createElement('style');
iconFontStyleElement.setAttribute('type', 'text/css');
iconFontStyleElement.setAttribute('id', 'iconfont-style');
iconFontStyleElement.innerHTML = iconFontCSS;
document.head.appendChild(iconFontStyleElement);

export const parameters = {
  layout: 'fullscreen',
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    exclude: new RegExp(excludeRegexArray.join('|')),
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/
    }
  },
  options: {
    storySort: {
      order: ['Documentation', 'Tokens, Icons, and Utilities', 'Components', 'Recipes', 'Templates', 'Pages']
    }
  },
  backgrounds: { disable: true },
  themes: {
    list: [
      { name: 'dark', class: 'theme-dark', color: '#1E1F2A', default: true },
      { name: 'dark-subtle', class: ['theme-dark','theme-dark-subtle'], color: '#2D2F3E' },
      { name: 'light', class: 'theme-light', color: '#fff' },
      { name: 'light-subtle', class: ['theme-light','theme-light-subtle'], color: '#edeeef' }
    ]
  }
};

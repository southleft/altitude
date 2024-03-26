export default function MyLogo({ html }) {

  document.addEventListener('onThemeSwitcherChange', (event) => {
    const target = event;
    this.currentTheme = target.detail.currentTheme;
  });

  console.log(this.currentTheme);

  return html`
    <al-logo href="/" variant="${this.currentTheme !== 'altitude' ? this.currentTheme : null}">
      ${this.currentTheme !== 'southleft' ? html`By Southleft` : html``}
    </al-logo>
  `;
}

import mainStyles from '!!raw-loader!sass-loader!../styles/main.scss';

/**
 * Set the global styles for the application
 */

export default function setGlobalStyles(attachmentElement?: HTMLElement) {
  if (!document.getElementById('al-theme-sheet')) {
    const mainStyleElement = document.createElement('style');
    mainStyleElement.innerHTML = mainStyles;
    mainStyleElement.setAttribute('type', 'text/css');
    mainStyleElement.setAttribute('id', 'al-theme-sheet');
    (attachmentElement || document.head).appendChild(mainStyleElement);
  }
}

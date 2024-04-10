import './app.css'
import App from './App.svelte'
import setGlobalStyles from '@southleft/al-web-components/dist/directives/setGlobalStyles';

setGlobalStyles();

const app = new App({
  target: document.getElementById('app'),
});

export default app

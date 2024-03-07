import './app.css'
import App from './App.svelte'
import Layout from './lib/Layout.svelte'
// // @ts-nocheck
// import { registerRouter, setLocation } from 'svelte-router-spa';
import setGlobalStyles from 'al-web-components/dist/directives/setGlobalStyles';

setGlobalStyles();

const app = new App({
  target: document.getElementById('app'),
});

export default app

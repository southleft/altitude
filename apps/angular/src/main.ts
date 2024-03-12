import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import setGlobalStyles from 'al-web-components/dist/directives/setGlobalStyles';

setGlobalStyles();

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));

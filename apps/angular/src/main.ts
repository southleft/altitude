import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
// v2: setGlobalStyles() was removed (MIGRATION.md §9). The global utility/layout
// classes (.al-l-*, .al-u-*) and base token defaults now ship as a static
// stylesheet (wired up via the `styles` array in angular.json), and theming is a
// scoped <al-theme> host (see app.component.html).
import 'al-web-components/components/theme';

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));

import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { defineCustomElements as defineJeepSqliteElements } from 'jeep-sqlite/loader';
import { defineCustomElements as definePwaElements } from '@ionic/pwa-elements/loader';
import { LOCALE_ID } from '@angular/core';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}
defineJeepSqliteElements(window);
definePwaElements(window);
// Call the element loader before the platform is bootstrapped
// CapacitorSQLiteWeb.defineCustomElements(window);

// platformBrowserDynamic().bootstrapModule(AppModule)
//   .catch(err => console.log(err));

platformBrowserDynamic().bootstrapModule(AppModule, {
  providers: [{ provide: LOCALE_ID, useValue: 'fr-FR' }]
}).catch(err => console.error(err));

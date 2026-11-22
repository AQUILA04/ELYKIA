import { enableProdMode, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { platformBrowser } from '@angular/platform-browser';
import { defineCustomElements as defineJeepSqliteElements } from 'jeep-sqlite/loader';
import { defineCustomElements as definePwaElements } from '@ionic/pwa-elements/loader';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}
defineJeepSqliteElements(window);
definePwaElements(window);

platformBrowser().bootstrapModule(AppModule, {
  applicationProviders: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    { provide: LOCALE_ID, useValue: 'fr-FR' },
  ],
}).catch(err => console.error(err));

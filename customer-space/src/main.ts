import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { capturePriorVisit } from './app/shared/utils/prior-visit';

capturePriorVisit();

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.log(err));

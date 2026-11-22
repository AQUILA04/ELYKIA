import { Routes } from '@angular/router';

export const COMPANY_SETTINGS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/company-settings-page/company-settings-page.component').then(
        (m) => m.CompanySettingsPageComponent,
      ),
  },
];

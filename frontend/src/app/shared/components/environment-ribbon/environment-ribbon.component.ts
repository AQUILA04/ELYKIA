import { Component } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { resolveEnvironmentLabel } from '../../utils/environment-label.util';

@Component({
  selector: 'app-environment-ribbon',
  templateUrl: './environment-ribbon.component.html',
  styleUrls: ['./environment-ribbon.component.scss']
})
export class EnvironmentRibbonComponent {
  readonly label: string | null = resolveEnvironmentLabel({
    envName: (environment as { envName?: string }).envName,
    apiUrl: environment.apiUrl,
    hostname: typeof window !== 'undefined' ? window.location.hostname : ''
  });
}

import { Component, Input } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { resolveEnvironmentLabel } from '../../../core/utils/environment-label.util';

@Component({
  selector: 'app-environment-banner',
  templateUrl: './environment-banner.component.html',
  styleUrls: ['./environment-banner.component.scss'],
  standalone: false
})
export class EnvironmentBannerComponent {
  /** Mode login : bandeau plus haut + message d'avertissement. */
  @Input() prominent = false;

  readonly label: string | null = resolveEnvironmentLabel({
    envName: (environment as { envName?: string }).envName,
    apiUrl: environment.apiUrl
  });
}

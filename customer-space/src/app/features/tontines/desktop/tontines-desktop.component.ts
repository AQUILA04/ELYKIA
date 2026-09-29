
import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import {
  CustomerTontineContributionSummary,
  CustomerTontineSession,
} from '../../../shared/models/customer.model';
import { ElykDesktopPageComponent } from '../../../shared/ui';

@Component({
  selector: 'app-tontines-desktop',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, ElykDesktopPageComponent],
  templateUrl: './tontines-desktop.component.html',
  styleUrls: ['./tontines-desktop.component.scss'],
})
export class TontinesDesktopComponent {
  readonly tontines = input<CustomerTontineContributionSummary[]>([]);
  readonly session = input<CustomerTontineSession | null>(null);
  readonly isLoading = input(false);
  readonly hasError = input(false);
  readonly showJoinHero = input(false);
  readonly showMemberBanner = input(false);
  readonly showNoSession = input(false);
  readonly showClosedSession = input(false);
  readonly progressPercent = input(0);
  readonly daysRemaining = input<number | null>(null);
  readonly retry = output<void>();
  readonly formatFrDate = input<(iso?: string) => string>((s) => s || '—');
  readonly statusLabel = input<(s: string) => string>((s) => s);
}

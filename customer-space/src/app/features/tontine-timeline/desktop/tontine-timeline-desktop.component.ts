
import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CustomerTontinePayment } from '../../../shared/models/customer.model';
import { ElykDesktopPageComponent } from '../../../shared/ui';

@Component({
  selector: 'app-tontine-timeline-desktop',
  standalone: true,
  imports: [CommonModule, IonicModule, ElykDesktopPageComponent],
  templateUrl: './tontine-timeline-desktop.component.html',
  styleUrls: ['./tontine-timeline-desktop.component.scss'],
})
export class TontineTimelineDesktopComponent {
  readonly payments = input<CustomerTontinePayment[]>([]);
  readonly isLoading = input(false);
  readonly back = output<void>();
}

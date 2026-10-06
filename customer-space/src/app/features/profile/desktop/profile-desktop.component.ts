import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterLink } from '@angular/router';
import { CustomerSession } from '../../../shared/models/customer-auth.model';
import { ElykDesktopPageComponent } from '../../../shared/ui';

@Component({
  selector: 'app-profile-desktop',
  standalone: true,
  imports: [CommonModule, IonicModule, ElykDesktopPageComponent, RouterLink],
  templateUrl: './profile-desktop.component.html',
  styleUrls: ['./profile-desktop.component.scss'],
})
export class ProfileDesktopComponent {
  readonly session = input<CustomerSession | null>(null);
  readonly appVersion = input('');
  readonly logout = output<void>();
}

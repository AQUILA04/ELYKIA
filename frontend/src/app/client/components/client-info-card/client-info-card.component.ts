import { Component, Input } from '@angular/core';
import { SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-client-info-card',
  templateUrl: './client-info-card.component.html',
  styleUrls: ['./client-info-card.component.scss']
})
export class ClientInfoCardComponent {
  @Input() client: any;
  @Input() safeProfilPhotoUrl: SafeUrl | null = null;
}

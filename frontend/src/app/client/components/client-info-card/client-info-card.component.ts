import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-client-info-card',
  templateUrl: './client-info-card.component.html',
  styleUrls: ['./client-info-card.component.scss']
})
export class ClientInfoCardComponent implements OnChanges {
  @Input() client: any;
  @Input() safeProfilPhotoUrl: SafeUrl | null = null;

  photoLoadFailed = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['safeProfilPhotoUrl']) {
      this.photoLoadFailed = false;
    }
  }

  onPhotoError(): void {
    this.photoLoadFailed = true;
  }

  get showPhotoPlaceholder(): boolean {
    return !this.safeProfilPhotoUrl || this.photoLoadFailed;
  }
}

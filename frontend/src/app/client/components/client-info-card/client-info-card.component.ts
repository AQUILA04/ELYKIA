import { Component, HostListener, Input, OnChanges, SimpleChanges } from '@angular/core';
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
  showPhotoPreview = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['safeProfilPhotoUrl']) {
      this.photoLoadFailed = false;
      this.showPhotoPreview = false;
    }
  }

  onPhotoError(): void {
    this.photoLoadFailed = true;
    this.showPhotoPreview = false;
  }

  get showPhotoPlaceholder(): boolean {
    return !this.safeProfilPhotoUrl || this.photoLoadFailed;
  }

  get canPreviewPhoto(): boolean {
    return !!this.safeProfilPhotoUrl && !this.photoLoadFailed;
  }

  get clientFullName(): string {
    if (!this.client) {
      return '';
    }
    return `${this.client.lastname} ${this.client.firstname}`.trim();
  }

  get photoPreviewTitle(): string {
    return `Photo de profil de ${this.clientFullName}`;
  }

  openPhotoPreview(): void {
    if (this.canPreviewPhoto) {
      this.showPhotoPreview = true;
    }
  }

  closePhotoPreview(): void {
    this.showPhotoPreview = false;
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.showPhotoPreview) {
      this.closePhotoPreview();
    }
  }
}

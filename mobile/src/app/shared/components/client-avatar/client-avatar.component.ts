import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { IonicModule, ModalController } from '@ionic/angular';
import { ImagePreviewComponent } from '../image-preview/image-preview.component';
import { ClientPhotoUrlService } from '../../../core/services/client/client-photo-url.service';
import { preferLocalPhotoPath, resolveClientPhotoSrc } from '../../../core/utils/client-photo-display.util';

const DEFAULT_AVATAR_MARKER = 'person-circle-outline';
let cachedBasePath: Promise<string> | null = null;

function loadBasePath(): Promise<string> {
  if (!cachedBasePath) {
    cachedBasePath = Filesystem.getUri({ path: '', directory: Directory.ExternalStorage })
      .then(({ uri }) => uri)
      .catch(() => '');
  }
  return cachedBasePath;
}

/**
 * Avatar client : photo de profil (miniature locale) ou initiales.
 * Un clic ouvre l'aperçu agrandi sans propager l'événement (la carte parente reste cliquable).
 */
@Component({
  selector: 'app-client-avatar',
  standalone: true,
  imports: [CommonModule, IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="elyk-avatar client-avatar"
         [class.client-avatar--photo]="!!src && !failed"
         [style.width.px]="size" [style.height.px]="size" [style.min-width.px]="size"
         [style.font-size.px]="size ? size * 0.32 : null"
         [style.border-radius.px]="size ? size / 4 : null"
         (click)="onClick($event)">
      <img *ngIf="src && !failed" [src]="src" alt="" loading="lazy" (error)="failed = true" />
      <span *ngIf="!src || failed">{{ initials }}</span>
    </div>
  `,
  styles: [`
    :host { display: inline-block; flex-shrink: 0; }
    .client-avatar { overflow: hidden; }
    .client-avatar--photo { cursor: zoom-in; padding: 0; }
    .client-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
  `]
})
export class ClientAvatarComponent implements OnInit {
  @Input() name: string | null | undefined;
  @Input() clientId: string | number | null | undefined;
  @Input() profilPhoto: string | null | undefined;
  @Input() profilPhotoThumbUrl: string | null | undefined;
  @Input() profilPhotoUrl: string | null | undefined;
  /** Taille en px ; absente = taille par défaut de `.elyk-avatar`. */
  @Input() size: number | null = null;
  /** 1 ou 2 initiales. */
  @Input() initialsCount = 1;

  failed = false;
  private basePath = '';

  constructor(
    private sanitizer: DomSanitizer,
    private modalController: ModalController,
    private clientPhotoUrlService: ClientPhotoUrlService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    void loadBasePath().then((p) => {
      this.basePath = p;
      this.cdr.markForCheck();
    });
  }

  get initials(): string {
    const name = (this.name || '?').trim() || '?';
    return name.substring(0, this.initialsCount).toUpperCase();
  }

  get src(): string | SafeUrl | null {
    const path = preferLocalPhotoPath(this.profilPhotoThumbUrl, this.profilPhoto, this.profilPhotoUrl);
    if (!path) {
      return null;
    }
    const resolved = resolveClientPhotoSrc(path, this.basePath, this.sanitizer);
    return String(resolved).includes(DEFAULT_AVATAR_MARKER) ? null : resolved;
  }

  async onClick(event: Event): Promise<void> {
    if (!this.src || this.failed) {
      return; // pas de photo : le clic remonte à la carte
    }
    event.stopPropagation();
    const fullName = this.name || 'Client';
    // Original local si disponible, sinon miniature locale ; jamais d'URL MinIO brute.
    const local = [this.profilPhoto, this.profilPhotoThumbUrl, this.profilPhotoUrl]
      .find((p) => !!p && !String(p).startsWith('http'));
    if (local) {
      const url = String(resolveClientPhotoSrc(local, this.basePath, this.sanitizer));
      if (!url.includes(DEFAULT_AVATAR_MARKER)) {
        await this.openPreview(url, fullName);
        return;
      }
    }
    const id = Number(this.clientId);
    if (!id) {
      return;
    }
    try {
      const entries = await this.clientPhotoUrlService.getUrls([id], 'PROFIL', 'ORIGINAL');
      if (entries[0]?.url) {
        await this.openPreview(entries[0].url, fullName);
      }
    } catch {
      /* hors ligne / non authentifié : on ignore */
    }
  }

  private async openPreview(imageUrl: string, fullName: string): Promise<void> {
    const modal = await this.modalController.create({
      component: ImagePreviewComponent,
      cssClass: 'image-preview-modal',
      componentProps: { imageUrl, fullName }
    });
    await modal.present();
  }
}

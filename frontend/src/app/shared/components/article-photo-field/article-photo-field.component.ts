import { Component, Input, OnDestroy } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AlertService } from 'src/app/shared/service/alert.service';

@Component({
  selector: 'app-article-photo-field',
  templateUrl: './article-photo-field.component.html',
  styleUrls: ['./article-photo-field.component.scss']
})
export class ArticlePhotoFieldComponent implements OnDestroy {
  @Input() inputId = 'article-photo';
  @Input() label = 'Photo';
  @Input() alt = 'Aperçu de la photo';
  @Input() ownUrl: string | null = null;
  @Input() inheritedUrl: string | null = null;
  @Input() inheritedHint: string | null = null;

  selectedFile: File | null = null;
  removed = false;
  previewObjectUrl: string | null = null;

  private readonly maxPhotoBytes = 5 * 1024 * 1024;

  constructor(private alertService: AlertService) {}

  ngOnDestroy(): void {
    this.revokePreview();
  }

  get previewSrc(): string | null {
    if (this.previewObjectUrl) {
      return this.previewObjectUrl;
    }
    if (!this.removed && this.ownUrl) {
      return this.ownUrl;
    }
    return this.inheritedUrl;
  }

  get canRemovePhoto(): boolean {
    return !!this.previewObjectUrl || (!this.removed && !!this.ownUrl);
  }

  get showsInheritedPhoto(): boolean {
    return !this.previewObjectUrl && (this.removed || !this.ownUrl) && !!this.inheritedUrl && !!this.inheritedHint;
  }

  shouldDeleteStoredPhoto(): boolean {
    return this.removed && !!this.ownUrl && !this.selectedFile;
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) {
      return;
    }
    if (file.size > this.maxPhotoBytes) {
      this.alertService.showError('La photo ne doit pas dépasser 5 Mo');
      return;
    }
    this.selectedFile = file;
    this.removed = false;
    this.revokePreview();
    this.previewObjectUrl = URL.createObjectURL(file);
  }

  removePhoto(): void {
    this.selectedFile = null;
    this.removed = true;
    this.revokePreview();
  }

  private revokePreview(): void {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
  }
}

export function saveArticlePhoto(
  id: number | undefined,
  field: ArticlePhotoFieldComponent | undefined,
  upload: (id: number, file: File) => Observable<unknown>,
  remove: (id: number) => Observable<unknown>
): Observable<unknown> {
  if (!id || !field) {
    return of(null);
  }
  if (field.selectedFile) {
    return upload(id, field.selectedFile);
  }
  if (field.shouldDeleteStoredPhoto()) {
    return remove(id);
  }
  return of(null);
}

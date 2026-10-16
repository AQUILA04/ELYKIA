import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ArticleTypeService, ArticleType } from '../service/article-type.service';
import { AlertService } from 'src/app/shared/service/alert.service';

@Component({
  selector: 'app-add',
  templateUrl: './add.component.html',
  styleUrls: ['./add.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class AddComponent implements OnInit, OnDestroy {
  private dateIntervalId?: ReturnType<typeof setInterval>;

  form!: FormGroup;
  id?: number;
  isEditMode = false;
  isLoading = false;
  currentDate = new Date();
  existingPhotoUrl: string | null = null;
  photoRemoved = false;
  photoFile: File | null = null;
  previewObjectUrl: string | null = null;
  private readonly maxPhotoBytes = 5 * 1024 * 1024;

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private articleTypeService: ArticleTypeService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.id = this.route.snapshot.params['id'] ? +this.route.snapshot.params['id'] : undefined;
    if (this.id) {
      this.isEditMode = true;
      this.loadType(this.id);
    }

    this.dateIntervalId = setInterval(() => {
      this.currentDate = new Date();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.dateIntervalId) {
      clearInterval(this.dateIntervalId);
    }
    this.revokePreview();
  }

  get previewSrc(): string | null {
    if (this.previewObjectUrl) {
      return this.previewObjectUrl;
    }
    if (!this.photoRemoved && this.existingPhotoUrl) {
      return this.existingPhotoUrl;
    }
    return null;
  }

  get canRemovePhoto(): boolean {
    return !!this.previewObjectUrl || (!this.photoRemoved && !!this.existingPhotoUrl);
  }

  initForm(): void {
    this.form = this.formBuilder.group({
      name: ['', Validators.required],
      code: [''],
      description: ['']
    });
  }

  loadType(id: number): void {
    this.isLoading = true;
    this.articleTypeService.getType(id).subscribe({
      next: (res) => {
        if (res.statusCode === 200) {
          this.form.patchValue(res.data);
          this.existingPhotoUrl = res.data?.photoUrl || res.data?.displayPhotoUrl || null;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading type', error);
        this.alertService.showError('Erreur lors du chargement du type');
        this.isLoading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const type: ArticleType = this.form.value;
    const request$ = this.isEditMode && this.id
      ? this.articleTypeService.updateType(this.id, type)
      : this.articleTypeService.createType(type);

    request$.pipe(
      switchMap((res: any) => {
        const id = this.id || res?.data?.id;
        return this.persistPhoto(id);
      })
    ).subscribe({
      next: () => {
        this.alertService.showSuccess(this.isEditMode ? 'Type mis à jour' : 'Type créé');
        this.router.navigate(['/article-type']);
      },
      error: (error) => {
        console.error('Error saving type', error);
        this.alertService.showError(
          this.isEditMode ? 'Erreur lors de la mise à jour' : 'Erreur lors de la création'
        );
        this.isLoading = false;
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/article-type']);
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
    this.photoFile = file;
    this.photoRemoved = false;
    this.revokePreview();
    this.previewObjectUrl = URL.createObjectURL(file);
  }

  removePhoto(): void {
    this.photoFile = null;
    this.photoRemoved = true;
    this.revokePreview();
  }

  private persistPhoto(id?: number): Observable<unknown> {
    if (!id) {
      return of(null);
    }
    if (this.photoFile) {
      return this.articleTypeService.uploadPhoto(id, this.photoFile);
    }
    if (this.photoRemoved && this.existingPhotoUrl) {
      return this.articleTypeService.deletePhoto(id);
    }
    return of(null);
  }

  private revokePreview(): void {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
  }
}

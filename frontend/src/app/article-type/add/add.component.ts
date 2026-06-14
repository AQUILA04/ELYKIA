import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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

    request$.subscribe({
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
}

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ArticleTypeService, ArticleType } from '../service/article-type.service';
import { AlertService } from 'src/app/shared/service/alert.service';

@Component({
  selector: 'app-add',
  templateUrl: './add.component.html',
  styleUrls: ['./add.component.scss']
})
export class AddComponent implements OnInit {
  form!: FormGroup;
  id?: number;
  isEditMode = false;

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private articleTypeService: ArticleTypeService,
    private alertService: AlertService
  ) { }

  ngOnInit(): void {
    this.initForm();
    this.id = +this.route.snapshot.params['id'];
    if (this.id) {
      this.isEditMode = true;
      this.loadType(this.id);
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
    this.articleTypeService.getType(id).subscribe(
      res => {
        if (res.statusCode === 200) {
          this.form.patchValue(res.data);
        }
      },
      error => {
        console.error('Error loading type', error);
        this.alertService.showError('Erreur lors du chargement du type');
      }
    );
  }

  onSubmit(): void {
    if (this.form.valid) {
      const type: ArticleType = this.form.value;
      if (this.isEditMode && this.id) {
        this.articleTypeService.updateType(this.id, type).subscribe(
          () => {
            this.alertService.showSuccess('Type mis à jour');
            this.router.navigate(['/article-type']);
          },
          error => this.alertService.showError('Erreur lors de la mise à jour')
        );
      } else {
        this.articleTypeService.createType(type).subscribe(
          () => {
            this.alertService.showSuccess('Type créé');
            this.router.navigate(['/article-type']);
          },
          error => this.alertService.showError('Erreur lors de la création')
        );
      }
    }
  }

  onCancel(): void {
    this.router.navigate(['/article-type']);
  }
}

import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ItemService, Article, NewArticleData } from '../service/item.service';
import { AlertService } from 'src/app/shared/service/alert.service';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { NgxSpinnerService } from 'ngx-spinner';

import { ArticleTypeService, ArticleType } from 'src/app/article-type/service/article-type.service';

@Component({
  selector: 'app-add',
  templateUrl: './add.component.html',
  styleUrls: ['./add.component.scss']
})
export class AddComponent implements OnInit {
  articleForm!: FormGroup;
  articleId?: number;
  types: ArticleType[] = [];
  article: Article | undefined;
  isLoading = false;

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private itemService: ItemService,
    private router: Router,
    private alertService: AlertService,
    private tokenStorage: TokenStorageService,
    private spinner: NgxSpinnerService,
    private articleTypeService: ArticleTypeService
  ) { }

  ngOnInit(): void {
    this.initForm();
    this.loadTypes();
    this.route.params.subscribe(params => {
      this.articleId = +params['id'];
      if (this.articleId) {
        this.loadArticle(this.articleId);
      }
    });
  }

  loadTypes(): void {
    this.articleTypeService.getAllTypes().subscribe(
      (data) => {
        this.types = data.data;
      },
      (error) => {
        console.error('Erreur lors du chargement des types d\'articles', error);
      }
    );
  }

  loadArticle(articleId: number): void {
    this.itemService.getArticleById(articleId).subscribe(
      (data: any) => {
        console.log(data)
        this.articleForm.patchValue({
          name: data.data.name,
          marque: data.data.marque,
          model: data.data.model || '',
          type: data.data.type,
          purchasePrice: data.data.purchasePrice,
          sellingPrice: data.data.sellingPrice,
          creditSalePrice: data.data.creditSalePrice,
          reorderPoint: data.data.reorderPoint,
          optimalStockLevel: data.data.optimalStockLevel,
          isSeasonal: data.data.isSeasonal
        });
      },
      error => {
        console.error('Erreur lors du chargement de l\'article à modifier', error);
      }
    );
  }

  initForm(): void {
    this.articleForm = this.formBuilder.group({
      name: ['', Validators.required],
      marque: ['', Validators.required],
      model: [''],
      type: ['', Validators.required],
      purchasePrice: ['', Validators.required],
      sellingPrice: ['', Validators.required],
      creditSalePrice: [''],
      reorderPoint: ['', [Validators.required, Validators.min(0)]],
      optimalStockLevel: ['', [Validators.required, Validators.min(0)]],
      isSeasonal: [false]
    }, { validators: this.priceOrderValidator });
  }

  priceOrderValidator(control: AbstractControl): ValidationErrors | null {
    const purchasePrice = control.get('purchasePrice')?.value;
    const sellingPrice = control.get('sellingPrice')?.value;
    const creditSalePrice = control.get('creditSalePrice')?.value;

    if (purchasePrice !== null && sellingPrice !== null) {
      // Case where creditSalePrice is also provided
      if (creditSalePrice !== null && creditSalePrice !== '') {
        if (purchasePrice > sellingPrice || sellingPrice > creditSalePrice) {
          return { priceOrderInvalid: true };
        }
      } else { // Case where creditSalePrice is not provided
        if (purchasePrice > sellingPrice) {
          return { priceOrderInvalid: true };
        }
      }
    }
    return null;
  }


  setFormValues(article: Article): void {
    this.articleForm.patchValue({
      name: article.name,
      marque: article.marque,
      model: article.model,
      type: article.type,
      purchasePrice: article.purchasePrice,
      sellingPrice: article.sellingPrice,
      creditSalePrice: article.creditSalePrice,
      reorderPoint: article.reorderPoint,
      optimalStockLevel: article.optimalStockLevel,
      isSeasonal: article.isSeasonal
    });
  }

  onSubmit(): void {
    if (this.articleForm.valid) {
      this.spinner.show();
      const formData: NewArticleData = {
        id: this.articleId!,
        name: this.articleForm.value.name,
        marque: this.articleForm.value.marque,
        model: this.articleForm.value.model || '',
        type: this.articleForm.value.type,
        purchasePrice: this.articleForm.value.purchasePrice,
        sellingPrice: this.articleForm.value.sellingPrice,
        creditSalePrice: this.articleForm.value.creditSalePrice,
        reorderPoint: this.articleForm.value.reorderPoint,
        optimalStockLevel: this.articleForm.value.optimalStockLevel,
        isSeasonal: this.articleForm.value.isSeasonal
      };

      if (this.articleId) {
        this.itemService.updateArticle(formData).subscribe(
          response => {
            this.spinner.hide();
            this.alertService.showSuccess('Article mis à jour avec succès');
            this.router.navigate(['/list']);
          },
          error => {
            this.spinner.hide();
            const errorMessage = error?.error?.message || 'Erreur lors de la mise à jour de l\'article';
            this.alertService.showError(errorMessage);
            console.error('Erreur lors de la mise à jour de l\'article', error);
          }
        );
      } else {
        this.itemService.addArticle(formData).subscribe(
          response => {
            this.spinner.hide();
            this.alertService.showSuccess('Article ajouté avec succès');
            this.router.navigate(['/list']);
          },
          error => {
            this.spinner.hide();
            const errorMessage = error?.error?.message || 'Erreur lors de l\'ajout de l\'article';
            this.alertService.showError(errorMessage);
            console.error('Erreur lors de l\'ajout de l\'article', error);
          }
        );
      }
    }
  }
  onCancel(): void {
    this.router.navigate(['/list']);
  }
}

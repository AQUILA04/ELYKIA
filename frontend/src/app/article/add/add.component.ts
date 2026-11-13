import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ItemService, Article, NewArticleData } from '../service/item.service';
import { halfPackageUnits } from '../packaging';
import { AlertService } from 'src/app/shared/service/alert.service';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { NgxSpinnerService } from 'ngx-spinner';

import { ArticleTypeService, ArticleType } from 'src/app/article-type/service/article-type.service';
import {
  ArticlePhotoFieldComponent,
  saveArticlePhoto
} from 'src/app/shared/components/article-photo-field/article-photo-field.component';

@Component({
  selector: 'app-add',
  templateUrl: './add.component.html',
  styleUrls: ['./add.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AddComponent implements OnInit {
  @ViewChild(ArticlePhotoFieldComponent) photoField?: ArticlePhotoFieldComponent;

  articleForm!: FormGroup;
  articleId?: number;
  types: ArticleType[] = [];
  article: Article | undefined;
  isLoading = false;
  existingOwnPhoto: string | null = null;
  inheritedPhotoUrl: string | null = null;

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
        this.types = data.data || [];
        this.refreshInherited(this.articleForm.get('type')?.value);
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
          isSeasonal: data.data.isSeasonal,
          packagingType: data.data.packagingType || 'NONE',
          unitsPerPackage: data.data.unitsPerPackage ?? null,
          wholesalePurchasePrice: data.data.wholesalePurchasePrice ?? null,
          halfWholesalePurchasePrice: data.data.halfWholesalePurchasePrice ?? null
        });
        this.existingOwnPhoto = data.data.photoUrl || null;
        this.inheritedPhotoUrl = data.data.photoUrl ? null : (data.data.displayPhotoUrl || null);
        this.refreshInherited(data.data.type);
        this.onPackagingTypeChanged(data.data.packagingType || 'NONE');
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
      isSeasonal: [false],
      packagingType: ['NONE'],
      unitsPerPackage: [null],
      unitsPerHalfPackage: [null],
      wholesalePurchasePrice: [null],
      halfWholesalePurchasePrice: [null],
      wholesaleSalePrice: [null],
      halfWholesaleSalePrice: [null],
      salePacks: this.formBuilder.array([])
    }, { validators: [this.priceOrderValidator, this.packagingValidator] });

    this.articleForm.get('packagingType')?.valueChanges.subscribe(type => {
      this.onPackagingTypeChanged(type);
    });
    this.articleForm.get('type')?.valueChanges.subscribe(type => {
      this.refreshInherited(type);
    });
  }

  get hasPackaging(): boolean {
    const type = this.articleForm?.get('packagingType')?.value;
    return type && type !== 'NONE';
  }

  get unitsAreOdd(): boolean {
    const units = Number(this.articleForm?.get('unitsPerPackage')?.value);
    return this.hasPackaging && units >= 2 && units % 2 !== 0;
  }

  get hasHalf(): boolean {
    return halfPackageUnits({
      unitsPerPackage: this.articleForm?.get('unitsPerPackage')?.value,
      unitsPerHalfPackage: this.unitsAreOdd
        ? this.articleForm?.get('unitsPerHalfPackage')?.value
        : null
    }) != null || (this.hasPackaging && !this.unitsAreOdd && Number(this.articleForm?.get('unitsPerPackage')?.value) >= 2);
  }

  get salePacks(): FormArray {
    return this.articleForm.get('salePacks') as FormArray;
  }

  addSalePack(): void {
    this.salePacks.push(this.formBuilder.group({
      quantity: [null, [Validators.required, Validators.min(2)]],
      salePrice: [null, [Validators.required, Validators.min(0.01)]]
    }));
  }

  removeSalePack(index: number): void {
    this.salePacks.removeAt(index);
  }

  onPackagingTypeChanged(type: string): void {
    const unitsCtrl = this.articleForm.get('unitsPerPackage');
    if (type && type !== 'NONE') {
      unitsCtrl?.setValidators([Validators.required, Validators.min(2)]);
    } else {
      unitsCtrl?.clearValidators();
      this.articleForm.patchValue({
        unitsPerPackage: null,
        unitsPerHalfPackage: null,
        wholesalePurchasePrice: null,
        halfWholesalePurchasePrice: null,
        wholesaleSalePrice: null,
        halfWholesaleSalePrice: null
      }, { emitEvent: false });
    }
    unitsCtrl?.updateValueAndValidity({ emitEvent: false });
  }

  packagingValidator(control: AbstractControl): ValidationErrors | null {
    const type = control.get('packagingType')?.value;
    if (!type || type === 'NONE') {
      return null;
    }
    const units = Number(control.get('unitsPerPackage')?.value);
    if (!units || units < 2) {
      return { packagingUnitsInvalid: true };
    }
    const half = Number(control.get('unitsPerHalfPackage')?.value);
    if (units % 2 !== 0 && control.get('unitsPerHalfPackage')?.value !== null
        && control.get('unitsPerHalfPackage')?.value !== '' && (!half || half < 1 || half >= units)) {
      return { halfPackageInvalid: true };
    }
    return null;
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
      isSeasonal: article.isSeasonal,
      packagingType: article.packagingType || 'NONE',
      unitsPerPackage: article.unitsPerPackage ?? null,
      unitsPerHalfPackage: article.unitsPerHalfPackage ?? null,
      wholesalePurchasePrice: article.wholesalePurchasePrice ?? null,
      halfWholesalePurchasePrice: article.halfWholesalePurchasePrice ?? null,
      wholesaleSalePrice: article.wholesaleSalePrice ?? null,
      halfWholesaleSalePrice: article.halfWholesaleSalePrice ?? null
    });
    this.salePacks.clear();
    (article.salePacks || []).forEach(pack => {
      this.salePacks.push(this.formBuilder.group({
        quantity: [pack.quantity, [Validators.required, Validators.min(2)]],
        salePrice: [pack.salePrice, [Validators.required, Validators.min(0.01)]]
      }));
    });
  }

  onSubmit(): void {
    if (this.articleForm.valid) {
      this.isLoading = true;
      this.spinner.show();
      const packagingType = this.articleForm.value.packagingType || 'NONE';
      const hasPack = packagingType !== 'NONE';
      const units = Number(this.articleForm.value.unitsPerPackage);
      const odd = hasPack && units % 2 !== 0;
      const halfQty = odd && this.articleForm.value.unitsPerHalfPackage
        ? Number(this.articleForm.value.unitsPerHalfPackage)
        : null;
      const halfDefined = hasPack && (units % 2 === 0 || halfQty != null);
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
        isSeasonal: this.articleForm.value.isSeasonal,
        packagingType,
        unitsPerPackage: hasPack ? units : null,
        unitsPerHalfPackage: halfQty,
        wholesalePurchasePrice: hasPack ? this.articleForm.value.wholesalePurchasePrice : null,
        halfWholesalePurchasePrice: halfDefined ? this.articleForm.value.halfWholesalePurchasePrice : null,
        wholesaleSalePrice: hasPack ? this.articleForm.value.wholesaleSalePrice : null,
        halfWholesaleSalePrice: halfDefined ? this.articleForm.value.halfWholesaleSalePrice : null,
        salePacks: (this.salePacks.value || [])
          .filter((pack: { quantity: number; salePrice: number }) => pack.quantity && pack.salePrice)
          .map((pack: { quantity: number; salePrice: number }) => ({
            quantity: Number(pack.quantity),
            salePrice: Number(pack.salePrice)
          }))
      };

      const save$ = this.articleId
        ? this.itemService.updateArticle(formData)
        : this.itemService.addArticle(formData);
      save$.pipe(
        switchMap((res: any) => {
          const id = this.articleId || res?.data?.id;
          return this.persistPhoto(id);
        })
      ).subscribe({
        next: () => {
          this.isLoading = false;
          this.spinner.hide();
          this.alertService.showSuccess(this.articleId ? 'Article mis à jour avec succès' : 'Article ajouté avec succès');
          this.router.navigate(['/article/list']);
        },
        error: (error) => {
          this.isLoading = false;
          this.spinner.hide();
          const errorMessage = error?.error?.message || 'Erreur lors de l\'enregistrement de l\'article';
          this.alertService.showError(errorMessage);
          console.error('Erreur lors de l\'enregistrement de l\'article', error);
        }
      });
    }
  }
  onCancel(): void {
    this.router.navigate(['/article/list']);
  }

  private refreshInherited(typeName: string): void {
    const match = this.types.find(type => type.name === typeName);
    if (!match) {
      return;
    }
    this.inheritedPhotoUrl = match.displayPhotoUrl || match.photoUrl || null;
  }

  private persistPhoto(id?: number): Observable<unknown> {
    return saveArticlePhoto(
      id,
      this.photoField,
      (photoId, file) => this.itemService.uploadPhoto(photoId, file),
      (photoId) => this.itemService.deletePhoto(photoId)
    );
  }
}

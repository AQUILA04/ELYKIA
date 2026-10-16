import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ItemService, Article, NewArticleData } from '../service/item.service';
import { AlertService } from 'src/app/shared/service/alert.service';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { NgxSpinnerService } from 'ngx-spinner';

import { ArticleTypeService, ArticleType } from 'src/app/article-type/service/article-type.service';

@Component({
  selector: 'app-add',
  templateUrl: './add.component.html',
  styleUrls: ['./add.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AddComponent implements OnInit, OnDestroy {
  articleForm!: FormGroup;
  articleId?: number;
  types: ArticleType[] = [];
  article: Article | undefined;
  isLoading = false;
  existingOwnPhoto: string | null = null;
  inheritedPhotoUrl: string | null = null;
  photoRemoved = false;
  photoFile: File | null = null;
  previewObjectUrl: string | null = null;
  private readonly maxPhotoBytes = 5 * 1024 * 1024;

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

  ngOnDestroy(): void {
    this.revokePreview();
  }

  get previewSrc(): string | null {
    if (this.previewObjectUrl) {
      return this.previewObjectUrl;
    }
    if (!this.photoRemoved && this.existingOwnPhoto) {
      return this.existingOwnPhoto;
    }
    return this.inheritedPhotoUrl;
  }

  get canRemovePhoto(): boolean {
    return !!this.previewObjectUrl || (!this.photoRemoved && !!this.existingOwnPhoto);
  }

  get showsInheritedPhoto(): boolean {
    return !this.previewObjectUrl && (this.photoRemoved || !this.existingOwnPhoto) && !!this.inheritedPhotoUrl;
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
      wholesalePurchasePrice: [null],
      halfWholesalePurchasePrice: [null]
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

  onPackagingTypeChanged(type: string): void {
    const unitsCtrl = this.articleForm.get('unitsPerPackage');
    if (type && type !== 'NONE') {
      unitsCtrl?.setValidators([Validators.required, Validators.min(2)]);
    } else {
      unitsCtrl?.clearValidators();
      this.articleForm.patchValue({
        unitsPerPackage: null,
        wholesalePurchasePrice: null,
        halfWholesalePurchasePrice: null
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
    if (units % 2 !== 0) {
      return { packagingUnitsOdd: true };
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
      wholesalePurchasePrice: article.wholesalePurchasePrice ?? null,
      halfWholesalePurchasePrice: article.halfWholesalePurchasePrice ?? null
    });
  }

  onSubmit(): void {
    if (this.articleForm.valid) {
      this.isLoading = true;
      this.spinner.show();
      const packagingType = this.articleForm.value.packagingType || 'NONE';
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
        unitsPerPackage: packagingType === 'NONE' ? null : this.articleForm.value.unitsPerPackage,
        wholesalePurchasePrice: packagingType === 'NONE' ? null : this.articleForm.value.wholesalePurchasePrice,
        halfWholesalePurchasePrice: packagingType === 'NONE' ? null : this.articleForm.value.halfWholesalePurchasePrice
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

  private refreshInherited(typeName: string): void {
    const match = this.types.find(type => type.name === typeName);
    if (!match) {
      return;
    }
    this.inheritedPhotoUrl = match.displayPhotoUrl || match.photoUrl || null;
  }

  private persistPhoto(id?: number): Observable<unknown> {
    if (!id) {
      return of(null);
    }
    if (this.photoFile) {
      return this.itemService.uploadPhoto(id, this.photoFile);
    }
    if (this.photoRemoved && this.existingOwnPhoto) {
      return this.itemService.deletePhoto(id);
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

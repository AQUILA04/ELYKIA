import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RecruitmentService } from '../../services/recruitment.service';

@Component({
  selector: 'app-offer-form',
  templateUrl: './offer-form.component.html',
  styleUrls: ['./offer-form.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false,
})
export class OfferFormComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  offerId?: number;
  imagePreview?: string;
  selectedImage?: File;
  selectedImageName?: string;
  isLoading = false;
  currentDate = new Date();
  private clockInterval?: ReturnType<typeof setInterval>;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private recruitmentService: RecruitmentService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      displayOrder: [0, Validators.required],
      highlights: this.fb.array([this.fb.control('')]),
    });
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.offerId = +id;
      this.recruitmentService.getOffer(this.offerId).subscribe((offer) => {
        this.form.patchValue({
          title: offer.title,
          description: offer.description,
          displayOrder: offer.displayOrder ?? 0,
        });
        this.highlights.clear();
        (offer.highlights?.length ? offer.highlights : ['']).forEach((h) => {
          this.highlights.push(this.fb.control(h));
        });
        if (offer.imageUrl) {
          this.imagePreview = offer.imageUrl;
        }
      });
    }
    this.clockInterval = setInterval(() => { this.currentDate = new Date(); }, 1000);
  }

  ngOnDestroy(): void {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
    if (this.imagePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(this.imagePreview);
    }
  }

  get highlights(): FormArray {
    return this.form.get('highlights') as FormArray;
  }

  addHighlight(): void {
    this.highlights.push(this.fb.control(''));
  }

  removeHighlight(index: number): void {
    if (this.highlights.length > 1) {
      this.highlights.removeAt(index);
    }
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.selectedImage = file;
    this.selectedImageName = file.name;
    if (this.imagePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(this.imagePreview);
    }
    this.imagePreview = URL.createObjectURL(file);
  }

  clearImage(): void {
    this.selectedImage = undefined;
    this.selectedImageName = undefined;
    if (this.imagePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(this.imagePreview);
    }
    this.imagePreview = undefined;
  }

  save(): void {
    if (this.form.invalid) return;
    this.isLoading = true;
    const dto = {
      title: this.form.value.title,
      description: this.form.value.description,
      displayOrder: this.form.value.displayOrder,
      highlights: (this.form.value.highlights as string[]).filter((h) => h?.trim()),
    };
    const req = this.offerId
      ? this.recruitmentService.updateOffer(this.offerId, dto, this.selectedImage)
      : this.recruitmentService.createOffer(dto, this.selectedImage);
    req.subscribe({
      next: () => {
        this.snackBar.open('Offre enregistrée', 'Fermer', { duration: 3000 });
        this.router.navigate(['/recruitment/offers']);
      },
      error: () => { this.isLoading = false; },
      complete: () => { this.isLoading = false; },
    });
  }

  cancel(): void {
    this.router.navigate(['/recruitment/offers']);
  }
}

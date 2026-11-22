import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import {
  BRAND_THEME_PRESETS,
  BrandThemePreset,
  CompanyBranding,
  CompanyBrandingUpdatePayload,
} from '@core/models/company-branding.model';
import {
  CompanyBrandingService,
  DEFAULT_LOGO_FALLBACK_URL,
} from '@core/services/company-branding.service';
import { isValidHexColor } from '@core/utils/color-palette.util';
import { AlertService } from '@shared/service/alert.service';

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
]);

interface ColorFieldConfig {
  controlName:
    | 'primaryColor'
    | 'secondaryColor'
    | 'accentColor'
    | 'sidebarBgColor'
    | 'sidebarTextColor'
    | 'backgroundColor';
  label: string;
  hint: string;
}

@Component({
  selector: 'app-company-settings-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './company-settings-page.component.html',
  styleUrls: ['./company-settings-page.component.scss'],
})
export class CompanySettingsPageComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly alertService = inject(AlertService);
  readonly brandingService = inject(CompanyBrandingService);

  readonly presets = BRAND_THEME_PRESETS;
  readonly fallbackLogoUrl = DEFAULT_LOGO_FALLBACK_URL;

  readonly colorFields: readonly ColorFieldConfig[] = [
    {
      controlName: 'primaryColor',
      label: 'Couleur primaire',
      hint: 'Boutons principaux, titres, lien actif et identité',
    },
    {
      controlName: 'secondaryColor',
      label: 'Couleur secondaire',
      hint: 'KPIs informatifs, accents secondaires et graphiques',
    },
    {
      controlName: 'accentColor',
      label: "Couleur d'accent",
      hint: 'Badges positifs, indicateurs de succès et mises en valeur',
    },
    {
      controlName: 'sidebarBgColor',
      label: 'Fond du menu latéral',
      hint: 'Couleur de fond de la barre de navigation gauche',
    },
    {
      controlName: 'sidebarTextColor',
      label: 'Texte du menu latéral',
      hint: 'Couleur des libellés et icônes du menu latéral',
    },
    {
      controlName: 'backgroundColor',
      label: 'Fond des pages',
      hint: "Teinte d'arrière-plan globale de l'espace de travail",
    },
  ];

  readonly isLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly isUploadingLogo = signal<boolean>(false);
  readonly isDeletingLogo = signal<boolean>(false);
  readonly isResettingTheme = signal<boolean>(false);
  readonly isDragOver = signal<boolean>(false);
  readonly currentTime = signal<string>(this.formatClock(new Date()));

  readonly branding = this.brandingService.branding;
  readonly isPreviewing = this.brandingService.isPreviewing;

  readonly activeLogoPreviewUrl = computed<string>(() => {
    return this.brandingService.sidebarLogoUrl();
  });

  form!: FormGroup;
  private formValueSub?: Subscription;
  private clockInterval?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.buildForm(this.branding());
    this.watchLiveColorChanges();
    this.loadProfile(false);
    this.clockInterval = setInterval(() => {
      this.currentTime.set(this.formatClock(new Date()));
    }, 30000);
  }

  ngOnDestroy(): void {
    this.formValueSub?.unsubscribe();
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
    this.brandingService.revertPreview();
  }

  loadProfile(showToast = true): void {
    this.isLoading.set(true);
    this.brandingService.fetchAdminProfile().subscribe({
      next: (profile) => {
        this.patchFormFromProfile(profile);
        this.isLoading.set(false);
        if (showToast) {
          this.alertService.showSuccess('Profil entreprise actualisé.');
        }
      },
      error: () => {
        this.isLoading.set(false);
        if (showToast) {
          this.alertService.showError(
            "Impossible de récupérer la configuration de l'entreprise.",
          );
        }
      },
    });
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.alertService.showWarning(
        "Veuillez corriger les champs invalides avant d'enregistrer.",
      );
      return;
    }

    const raw = this.form.getRawValue();
    const payload: CompanyBrandingUpdatePayload = {
      companyName: String(raw.companyName || '').trim(),
      shortName: this.emptyToNull(raw.shortName),
      tagline: this.emptyToNull(raw.tagline),
      address: this.emptyToNull(raw.address),
      phone: this.emptyToNull(raw.phone),
      email: this.emptyToNull(raw.email),
      website: this.emptyToNull(raw.website),
      taxId: this.emptyToNull(raw.taxId),
      primaryColor: String(raw.primaryColor).toLowerCase(),
      secondaryColor: String(raw.secondaryColor).toLowerCase(),
      accentColor: String(raw.accentColor).toLowerCase(),
      sidebarBgColor: String(raw.sidebarBgColor).toLowerCase(),
      sidebarTextColor: String(raw.sidebarTextColor).toLowerCase(),
      backgroundColor: String(raw.backgroundColor).toLowerCase(),
    };

    this.isSaving.set(true);
    this.brandingService.updateProfile(payload).subscribe({
      next: (saved) => {
        this.patchFormFromProfile(saved);
        this.isSaving.set(false);
        this.alertService.showSuccess(
          `Identité et charte graphique enregistrées (version v${saved.themeVersion}).`,
        );
      },
      error: (err) => {
        this.isSaving.set(false);
        const message =
          err?.error?.message ||
          "Erreur lors de l'enregistrement de la configuration de l'entreprise.";
        this.alertService.showError(message);
      },
    });
  }

  applyPreset(preset: BrandThemePreset): void {
    this.form.patchValue(preset.colors);
    this.form.markAsDirty();
    this.previewCurrentFormColors();
  }

  isPresetActive(preset: BrandThemePreset): boolean {
    if (!this.form) {
      return false;
    }
    const val = this.form.getRawValue();
    return (
      val.primaryColor?.toLowerCase() === preset.colors.primaryColor.toLowerCase() &&
      val.secondaryColor?.toLowerCase() === preset.colors.secondaryColor.toLowerCase() &&
      val.accentColor?.toLowerCase() === preset.colors.accentColor.toLowerCase() &&
      val.sidebarBgColor?.toLowerCase() === preset.colors.sidebarBgColor.toLowerCase() &&
      val.sidebarTextColor?.toLowerCase() === preset.colors.sidebarTextColor.toLowerCase() &&
      val.backgroundColor?.toLowerCase() === preset.colors.backgroundColor.toLowerCase()
    );
  }

  onColorPickerChange(controlName: ColorFieldConfig['controlName'], event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.value && isValidHexColor(input.value)) {
      this.form.get(controlName)?.setValue(input.value.toLowerCase());
      this.form.get(controlName)?.markAsDirty();
    }
  }

  cancelPreview(): void {
    this.brandingService.revertPreview();
    this.patchFormFromProfile(this.branding());
  }

  async onResetTheme(): Promise<void> {
    const confirmed = await this.alertService.showConfirmation(
      'Réinitialiser la charte graphique ?',
      "Les 6 couleurs reviendront à la palette officielle ELYKIA par défaut. Les informations de l'entreprise et le logo seront conservés.",
      'Réinitialiser',
      'Annuler',
    );
    if (!confirmed) {
      return;
    }

    this.isResettingTheme.set(true);
    this.brandingService.resetTheme().subscribe({
      next: (updated) => {
        this.patchFormFromProfile(updated);
        this.isResettingTheme.set(false);
        this.alertService.showSuccess('Charte graphique réinitialisée par défaut.');
      },
      error: () => {
        this.isResettingTheme.set(false);
        this.alertService.showError('Impossible de réinitialiser la charte graphique.');
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (file) {
      this.handleLogoUpload(file);
    }
    if (input) {
      input.value = '';
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.handleLogoUpload(file);
    }
  }

  async onDeleteLogo(): Promise<void> {
    const confirmed = await this.alertService.showConfirmation(
      'Supprimer le logo personnalisé ?',
      "Le logo par défaut d'ELYKIA sera à nouveau affiché dans la barre latérale et sur l'écran de connexion.",
      'Supprimer le logo',
      'Annuler',
    );
    if (!confirmed) {
      return;
    }

    this.isDeletingLogo.set(true);
    this.brandingService.deleteLogo().subscribe({
      next: (updated) => {
        this.isDeletingLogo.set(false);
        this.alertService.showSuccess(
          `Logo supprimé avec succès (version v${updated.themeVersion}).`,
        );
      },
      error: () => {
        this.isDeletingLogo.set(false);
        this.alertService.showError('Impossible de supprimer le logo.');
      },
    });
  }

  getColorValue(controlName: ColorFieldConfig['controlName']): string {
    const val = this.form?.get(controlName)?.value;
    return isValidHexColor(val) ? val : '#003366';
  }

  onPreviewLogoError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (img && !img.src.endsWith(DEFAULT_LOGO_FALLBACK_URL)) {
      img.src = DEFAULT_LOGO_FALLBACK_URL;
    }
  }

  private handleLogoUpload(file: File): void {
    if (!ALLOWED_LOGO_TYPES.has(file.type.toLowerCase())) {
      this.alertService.showWarning(
        'Format non pris en charge. Veuillez importer un fichier PNG, JPEG, WEBP ou SVG.',
      );
      return;
    }
    if (file.size > MAX_LOGO_SIZE_BYTES) {
      this.alertService.showWarning(
        'Le fichier dépasse la limite maximale de 2 Mo.',
      );
      return;
    }

    this.isUploadingLogo.set(true);
    this.brandingService.uploadLogo(file).subscribe({
      next: (updated) => {
        this.isUploadingLogo.set(false);
        this.alertService.showSuccess(
          `Logo téléversé et propagé (version v${updated.themeVersion}).`,
        );
      },
      error: (err) => {
        this.isUploadingLogo.set(false);
        const message =
          err?.error?.message || 'Erreur lors du téléversement du logo.';
        this.alertService.showError(message);
      },
    });
  }

  private buildForm(profile: CompanyBranding): void {
    this.form = this.fb.group({
      companyName: [
        profile.companyName,
        [Validators.required, Validators.maxLength(150)],
      ],
      shortName: [profile.shortName ?? '', [Validators.maxLength(60)]],
      tagline: [profile.tagline ?? '', [Validators.maxLength(180)]],
      address: [profile.address ?? '', [Validators.maxLength(255)]],
      phone: [profile.phone ?? '', [Validators.maxLength(50)]],
      email: [profile.email ?? '', [Validators.email, Validators.maxLength(150)]],
      website: [profile.website ?? '', [Validators.maxLength(255)]],
      taxId: [profile.taxId ?? '', [Validators.maxLength(80)]],
      primaryColor: [
        profile.primaryColor,
        [Validators.required, Validators.pattern(HEX_PATTERN)],
      ],
      secondaryColor: [
        profile.secondaryColor,
        [Validators.required, Validators.pattern(HEX_PATTERN)],
      ],
      accentColor: [
        profile.accentColor,
        [Validators.required, Validators.pattern(HEX_PATTERN)],
      ],
      sidebarBgColor: [
        profile.sidebarBgColor,
        [Validators.required, Validators.pattern(HEX_PATTERN)],
      ],
      sidebarTextColor: [
        profile.sidebarTextColor,
        [Validators.required, Validators.pattern(HEX_PATTERN)],
      ],
      backgroundColor: [
        profile.backgroundColor,
        [Validators.required, Validators.pattern(HEX_PATTERN)],
      ],
    });
  }

  private patchFormFromProfile(profile: CompanyBranding): void {
    this.form.patchValue(
      {
        companyName: profile.companyName,
        shortName: profile.shortName ?? '',
        tagline: profile.tagline ?? '',
        address: profile.address ?? '',
        phone: profile.phone ?? '',
        email: profile.email ?? '',
        website: profile.website ?? '',
        taxId: profile.taxId ?? '',
        primaryColor: profile.primaryColor,
        secondaryColor: profile.secondaryColor,
        accentColor: profile.accentColor,
        sidebarBgColor: profile.sidebarBgColor,
        sidebarTextColor: profile.sidebarTextColor,
        backgroundColor: profile.backgroundColor,
      },
      { emitEvent: false },
    );
    this.form.markAsPristine();
  }

  private watchLiveColorChanges(): void {
    this.formValueSub = this.form.valueChanges.subscribe(() => {
      this.previewCurrentFormColors();
    });
  }

  private previewCurrentFormColors(): void {
    const val = this.form.getRawValue();
    const persisted = this.branding();
    const colorKeys: Array<ColorFieldConfig['controlName']> = [
      'primaryColor',
      'secondaryColor',
      'accentColor',
      'sidebarBgColor',
      'sidebarTextColor',
      'backgroundColor',
    ];

    const validColors: Partial<CompanyBranding> = {};
    let hasColorDiff = false;

    for (const key of colorKeys) {
      const candidate = val[key];
      if (isValidHexColor(candidate)) {
        const normalized = candidate.toLowerCase();
        validColors[key] = normalized;
        if (normalized !== persisted[key].toLowerCase()) {
          hasColorDiff = true;
        }
      }
    }

    if (hasColorDiff) {
      this.brandingService.preview(validColors);
    } else if (this.isPreviewing()) {
      this.brandingService.revertPreview();
    }
  }

  private emptyToNull(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private formatClock(date: Date): string {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

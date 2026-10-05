import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { CustomerApiService } from '../../services/customer-api.service';
import { CustomerPaymentProof } from '../../models/customer.model';
import {
  applyDetectedReference,
  fileToPaymentProof,
  pickPaymentProofImageNative,
  shouldUseHtmlFilePickerForProof,
} from '../../utils/payment-proof-capture';

@Component({
  selector: 'app-payment-proof-picker',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
  templateUrl: './payment-proof-picker.component.html',
  styleUrls: ['./payment-proof-picker.component.scss'],
})
export class PaymentProofPickerComponent implements OnDestroy {
  @Input({ required: true }) form!: FormGroup;
  /** Form control name holding the detected/editable transfer reference. */
  @Input() referenceControlName = 'mobileMoneyReference';
  @Input() proofControlName = 'paymentProofId';
  @Input() testIdPrefix = 'e2e-payment-proof';

  @Output() referenceAutoFilled = new EventEmitter<string | null>();

  @ViewChild('imageInput') imageInput?: ElementRef<HTMLInputElement>;
  @ViewChild('pdfInput') pdfInput?: ElementRef<HTMLInputElement>;

  private readonly api = inject(CustomerApiService);

  uploading = false;
  error = '';
  previewUrl: string | null = null;
  isPdf = false;
  fileName = '';
  ocrHint = '';
  private lastAutoFilledReference: string | null = null;
  private linkedOnSubmit = false;

  markSubmitted(): void {
    this.linkedOnSubmit = true;
  }

  ngOnDestroy(): void {
    this.revokePreview();
    if (!this.linkedOnSubmit) {
      void this.deleteCurrentProofBestEffort();
    }
  }

  async pickCapture(): Promise<void> {
    this.error = '';
    try {
      if (shouldUseHtmlFilePickerForProof()) {
        this.imageInput?.nativeElement.click();
        return;
      }
      const file = await pickPaymentProofImageNative();
      await this.upload(file.blob, file.fileName, file.previewUrl, false);
    } catch (e) {
      this.error = (e as Error)?.message || 'Sélection de la capture impossible.';
    }
  }

  pickPdf(): void {
    this.error = '';
    this.pdfInput?.nativeElement.click();
  }

  async onImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    try {
      const proof = await fileToPaymentProof(file);
      await this.upload(proof.blob, proof.fileName, proof.previewUrl, false);
    } catch (e) {
      this.error = (e as Error)?.message || 'Fichier image invalide.';
    }
  }

  async onPdfSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    try {
      const proof = await fileToPaymentProof(file);
      await this.upload(proof.blob, proof.fileName, null, true);
    } catch (e) {
      this.error = (e as Error)?.message || 'Fichier PDF invalide.';
    }
  }

  async replace(): Promise<void> {
    await this.pickCapture();
  }

  async clear(): Promise<void> {
    await this.deleteCurrentProofBestEffort();
    this.form.get(this.proofControlName)?.setValue(null);
    this.revokePreview();
    this.previewUrl = null;
    this.isPdf = false;
    this.fileName = '';
    this.ocrHint = '';
    this.lastAutoFilledReference = null;
  }

  get hasProof(): boolean {
    return !!this.form?.get(this.proofControlName)?.value;
  }

  private async upload(
    blob: Blob,
    fileName: string,
    previewUrl: string | null,
    isPdf: boolean,
  ): Promise<void> {
    this.uploading = true;
    this.error = '';
    const replacesProofId = this.form.get(this.proofControlName)?.value as number | null;
    try {
      const result: CustomerPaymentProof = await firstValueFrom(
        this.api.uploadPaymentProof(blob, fileName, replacesProofId ?? undefined),
      );
      this.revokePreview();
      this.previewUrl = previewUrl;
      this.isPdf = isPdf || (result.contentType || '').includes('pdf');
      this.fileName = result.fileName || fileName;
      this.form.get(this.proofControlName)?.setValue(result.id);
      this.form.get(this.proofControlName)?.markAsDirty();
      this.applyOcr(result);
    } catch (e) {
      const err = e as { error?: { message?: string } };
      this.error = err?.error?.message || 'Envoi du justificatif impossible.';
    } finally {
      this.uploading = false;
    }
  }

  private applyOcr(result: CustomerPaymentProof): void {
    const detected = result.detectedReference ?? null;
    if (result.ocrStatus === 'SUCCESS' && detected) {
      const control = this.form.get(this.referenceControlName);
      const applied = applyDetectedReference(
        control?.value,
        this.lastAutoFilledReference,
        detected,
      );
      control?.setValue(applied.value);
      this.lastAutoFilledReference = applied.autoFilled;
      this.ocrHint = applied.autoFilled === detected
        ? 'Référence détectée automatiquement — vous pouvez la modifier.'
        : 'Référence détectée (non appliquée : champ déjà saisi).';
      this.referenceAutoFilled.emit(detected);
    } else if (result.ocrStatus === 'UNAVAILABLE') {
      this.ocrHint = 'Lecture automatique indisponible — saisissez la référence.';
    } else if (result.ocrStatus === 'NO_REFERENCE' || result.ocrStatus === 'FAILED') {
      this.ocrHint = 'Référence non détectée — saisissez-la manuellement.';
    } else {
      this.ocrHint = '';
    }
  }

  private async deleteCurrentProofBestEffort(): Promise<void> {
    const id = this.form?.get(this.proofControlName)?.value as number | null;
    if (!id) {
      return;
    }
    try {
      await firstValueFrom(this.api.deletePaymentProof(id));
    } catch {
      // covered by server-side 24h purge
    }
  }

  private revokePreview(): void {
    if (this.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.previewUrl);
    }
  }
}

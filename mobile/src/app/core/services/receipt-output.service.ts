import { Injectable } from '@angular/core';
import { LoadingController, ModalController } from '@ionic/angular';
import { PdfService } from './pdf.service';
import { FeedbackService } from './feedback.service';

/** Délai maximal de génération du PDF : au-delà, le chargement se ferme quoi qu'il arrive. */
export const RECEIPT_PDF_TIMEOUT_MS = 20_000;

export class ReceiptTimeoutError extends Error {
  constructor() {
    super('La génération du PDF a pris trop de temps.');
    this.name = 'ReceiptTimeoutError';
  }
}

/** Promesse bornée dans le temps : jamais de chargement infini sur le terrain. */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new ReceiptTimeoutError()), ms);
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/**
 * Sortie des reçus mobiles (modèle des reçus de vente) :
 * 1. à l'ouverture de l'aperçu, le reçu est enregistré en PDF sur la tablette ;
 * 2. « Imprimer » envoie le ticket à l'imprimante ; si l'impression échoue (imprimante absente ou
 *    déconnectée), le PDF est enregistré, un message le confirme et l'aperçu se ferme.
 * Le chargement est toujours fermé, même si le PDF ou l'impression échoue ou dépasse le délai.
 */
@Injectable({ providedIn: 'root' })
export class ReceiptOutputService {
  /** Chemin du dernier PDF enregistré par élément (évite un second enregistrement identique). */
  private readonly savedPaths = new WeakMap<HTMLElement, string>();

  constructor(
    private readonly pdfService: PdfService,
    private readonly loadingCtrl: LoadingController,
    private readonly modalCtrl: ModalController,
    private readonly feedback: FeedbackService
  ) {}

  /** Enregistre le reçu en PDF ; renvoie le chemin, ou null si l'enregistrement a échoué. */
  async savePdf(element: HTMLElement | null, type: string, reference: string): Promise<string | null> {
    if (!element) {
      return null;
    }
    const already = this.savedPaths.get(element);
    if (already) {
      return already;
    }
    const loading = await this.loadingCtrl.create({
      message: 'Enregistrement du reçu en PDF…',
      backdropDismiss: false,
      duration: RECEIPT_PDF_TIMEOUT_MS + 2_000
    });
    await loading.present();
    try {
      const path = await withTimeout(this.pdfService.saveReceipt(element, type, reference), RECEIPT_PDF_TIMEOUT_MS);
      this.savedPaths.set(element, path);
      return path;
    } catch (error) {
      console.error('Reçu PDF non enregistré', error);
      return null;
    } finally {
      await loading.dismiss().catch(() => undefined);
    }
  }

  /**
   * Imprime ; en cas d'échec, enregistre le PDF, l'annonce et ferme l'aperçu.
   * Renvoie `printed` ou `pdf` (ou `failed` si ni l'un ni l'autre n'a abouti).
   */
  async printOrSavePdf(options: {
    print: () => Promise<void>;
    element: HTMLElement | null;
    type: string;
    reference: string;
  }): Promise<'printed' | 'pdf' | 'failed'> {
    try {
      await options.print();
      await this.modalCtrl.dismiss({ printed: true }).catch(() => undefined);
      return 'printed';
    } catch (error) {
      console.warn('Impression impossible, repli PDF', error);
    }
    const path = await this.savePdf(options.element, options.type, options.reference);
    if (path) {
      await this.modalCtrl.dismiss({ printed: false, pdfPath: path }).catch(() => undefined);
      await this.feedback.success('L\'imprimante n\'est pas disponible. Le reçu est enregistré en PDF sur la tablette.', {
        title: 'Reçu enregistré',
        details: [path]
      });
      return 'pdf';
    }
    await this.feedback.error('Le reçu n\'a pu être ni imprimé ni enregistré en PDF. Vérifiez l\'imprimante et l\'espace de stockage, puis réessayez.', {
      title: 'Reçu non imprimé'
    });
    return 'failed';
  }
}

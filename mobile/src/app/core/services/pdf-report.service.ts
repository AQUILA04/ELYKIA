import { Injectable } from '@angular/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import * as html2pdf from 'html2pdf.js';

@Injectable({
  providedIn: 'root'
})
export class PdfReportService {

  private readonly REPORT_DIR = 'elykia/rapport';

  constructor() { }

  /**
   * Génère un PDF à partir de HTML et retourne le base64
   */
  async generatePDF(htmlContent: string, filename: string): Promise<string> {
    try {
      const options = {
        margin: [10, 10, 10, 10],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // Créer un élément temporaire pour html2pdf
      const element = document.createElement('div');
      element.innerHTML = htmlContent;
      element.style.width = '210mm'; // A4 width
      element.style.padding = '10mm';
      document.body.appendChild(element);

      // Générer le PDF et obtenir le blob
      const pdf = await html2pdf().from(element).set(options).output('blob');

      // Supprimer l'élément temporaire
      document.body.removeChild(element);

      // Convertir le blob en base64
      const base64 = await this.blobToBase64(pdf);
      return base64;
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      throw error;
    }
  }

  /**
   * Convertit un Blob en base64
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Extraire uniquement la partie base64 (sans le préfixe data:...)
        const base64 = base64String.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Sauvegarde le PDF dans External Storage
   */
  async savePDFToExternalStorage(pdfBase64: string, filename: string): Promise<string> {
    try {
      const isWeb = Capacitor.getPlatform() === 'web';
      const directory = isWeb ? Directory.Data : Directory.Documents;

      // Créer le répertoire si nécessaire
      await this.ensureDirectoryExists(directory);

      const fullPath = `${this.REPORT_DIR}/${filename}`;

      // Sauvegarder le fichier
      const result = await Filesystem.writeFile({
        path: fullPath,
        data: pdfBase64,
        directory: directory,
        recursive: true
      });

      console.log('PDF sauvegardé:', result.uri);

      if (isWeb) {
        await this.downloadPDFFromWeb(filename, fullPath);
      }

      return result.uri;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du PDF:', error);
      throw error;
    }
  }

  /**
   * Assure que le répertoire existe
   */
  private async ensureDirectoryExists(directory: Directory = Directory.Documents): Promise<void> {
    try {
      await Filesystem.mkdir({
        path: this.REPORT_DIR,
        directory: directory,
        recursive: true
      });
    } catch (error) {
      // Le répertoire existe déjà, c'est normal
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = (error as any).message;
        if (!errorMessage.includes('exists')) {
          console.error('Erreur lors de la création du répertoire:', error);
        }
      }
    }
  }

  private async downloadPDFFromWeb(fileName: string, filePath: string): Promise<void> {
    try {
        // 1. Read the file from Capacitor storage
        const result = await Filesystem.readFile({
            path: filePath,
            directory: Directory.Data
        });

        // 2. Convert Base64 to Blob
        const base64Data = result.data;
        const byteArray = Uint8Array.from(atob(base64Data as string), c => c.charCodeAt(0));
        const blob = new Blob([byteArray], { type: 'application/pdf' });

        // 3. Create a download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();

        // 4. Clean up
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Erreur lors du téléchargement du PDF', error);
    }
  }

  /**
   * Génère le nom de fichier avec date et heure
   */
  generateFilename(): string {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    return `rapport_${date}_${time}.pdf`;
  }

  /**
   * Retourne le chemin du répertoire des rapports
   */
  getReportDirectory(): string {
    return this.REPORT_DIR;
  }
}

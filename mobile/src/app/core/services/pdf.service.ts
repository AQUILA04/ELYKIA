import { Injectable } from '@angular/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import * as html2pdf from 'html2pdf.js';

@Injectable({
    providedIn: 'root'
})
export class PdfService {

    constructor() { }

    /**
     * Generates a PDF from an HTML element and saves it to the device's external storage.
     * Path: Documents/elykia/receipt/<type>/<date>/<reference>.pdf
     *
     * @param element The HTML element containing the receipt content.
     * @param type The type of receipt (e.g., 'recouvrement', 'distribution', 'collecte_tontine', 'livraison_tontine').
     * @param reference The unique reference for the receipt (used in the filename).
     */
    async saveReceipt(element: HTMLElement, type: string, reference: string): Promise<string> {
        try {
            const opt = {
                margin: 1,
                filename: `${reference}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'a6', orientation: 'portrait' } // A6 is good for receipts
            };

            // Generate PDF as Base64
            const pdfDataUri = await html2pdf().from(element).set(opt).outputPdf('datauristring');
            const base64Data = pdfDataUri.split(',')[1];

            // Prepare Directory
            const now = new Date();
            const dateFolder = now.toISOString().split('T')[0]; // YYYY-MM-DD
            const path = `Documents/elykia/receipt/${type}/${dateFolder}`;
            const fileName = `${reference}.pdf`;
            const fullPath = `${path}/${fileName}`;

            const isWeb = Capacitor.getPlatform() === 'web';
            const directory = isWeb ? Directory.Data : Directory.ExternalStorage;

            // Create directories if they don't exist
            await this.ensureDirectoryExists(path, directory);

            // Write File
            await Filesystem.writeFile({
                path: fullPath,
                data: base64Data,
                directory: directory,
            });

            console.log(`PDF Saved: ${fullPath}`);

            // On web, trigger browser download
            if (isWeb) {
                await this.downloadPDFFromWeb(fileName, fullPath);
            }

            return fullPath;

        } catch (error) {
            console.error('Error serving PDF:', error);
            throw error;
        }
    }

    private async ensureDirectoryExists(path: string, directory: Directory = Directory.ExternalStorage): Promise<void> {
        try {
            await Filesystem.stat({
                path: path,
                directory: directory
            });
        } catch (e) {
            // Directory doesn't exist, create it recursively
            await Filesystem.mkdir({
                path: path,
                directory: directory,
                recursive: true
            });
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
}

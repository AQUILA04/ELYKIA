import { Injectable } from '@angular/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
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

            // Create directories if they don't exist
            await this.ensureDirectoryExists(path);

            // Write File
            await Filesystem.writeFile({
                path: fullPath,
                data: base64Data,
                directory: Directory.ExternalStorage,
                // encoding: Encoding.UTF8 // Not needed for base64 data? actually writeFile expects string for data, usually base64 if no encoding or if binary.
            });

            console.log(`PDF Saved: ${fullPath}`);
            return fullPath;

        } catch (error) {
            console.error('Error serving PDF:', error);
            throw error;
        }
    }

    private async ensureDirectoryExists(path: string): Promise<void> {
        try {
            await Filesystem.stat({
                path: path,
                directory: Directory.ExternalStorage
            });
        } catch (e) {
            // Directory doesn't exist, create it recursively
            await Filesystem.mkdir({
                path: path,
                directory: Directory.ExternalStorage,
                recursive: true
            });
        }
    }
}

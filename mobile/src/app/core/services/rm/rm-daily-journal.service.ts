import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ExportLocationService } from '../export-location.service';
import { RmScopeService } from './rm-scope.service';
import { RmCloseQueueService } from './rm-close-queue.service';
import { RmContactQueueService } from './rm-contact-queue.service';
import { RmFieldControlQueueService } from './rm-field-control-queue.service';
import { RmTontineFieldControlQueueService } from './rm-tontine-field-control-queue.service';
import { RmCarnetVerificationQueueService } from './rm-carnet-verification-queue.service';
import { RmCreditCarnetVerificationQueueService } from './rm-credit-carnet-verification-queue.service';
import { RmCollectorAssignQueueService } from './rm-collector-assign-queue.service';
import { buildRmDailyJournal, RmDailyJournalOperation } from './rm-daily-journal.util';

const REPORT_DIR = 'elykia/rapports';

@Injectable({ providedIn: 'root' })
export class RmDailyJournalService {
  private readonly pdfUrl = `${environment.apiUrl}/api/v1/recovery-manager/daily-journal/pdf`;

  constructor(
    private readonly http: HttpClient,
    private readonly scope: RmScopeService,
    private readonly exportLocation: ExportLocationService,
    private readonly closeQueue: RmCloseQueueService,
    private readonly contactQueue: RmContactQueueService,
    private readonly fieldControlQueue: RmFieldControlQueueService,
    private readonly tontineFieldControlQueue: RmTontineFieldControlQueueService,
    private readonly carnetQueue: RmCarnetVerificationQueueService,
    private readonly creditCarnetQueue: RmCreditCarnetVerificationQueueService,
    private readonly assignQueue: RmCollectorAssignQueueService
  ) {}

  /** Enregistre le PDF du jour. `open` déclenche aussi le téléchargement ou l'ouverture du fichier. */
  async saveToday(options: { open: boolean }): Promise<void> {
    const now = new Date();
    const [closes, creditControls, tontineControls, creditCarnets, tontineCarnets, contacts, assigns] =
      await Promise.all([
        this.closeQueue.listAll(),
        this.fieldControlQueue.listAll(),
        this.tontineFieldControlQueue.listAll(),
        this.creditCarnetQueue.listAll(),
        this.carnetQueue.listAll(),
        this.contactQueue.listAll(),
        this.assignQueue.listAll()
      ]);
    const journal = buildRmDailyJournal(
      { closes, creditControls, tontineControls, creditCarnets, tontineCarnets, contacts, assigns },
      clientId => this.clientName(clientId),
      now
    );
    const bytes = await firstValueFrom(this.http.post(this.pdfUrl, {
      journalDate: journal.journalDate,
      operations: journal.operations.map(toRequestRow)
    }, { responseType: 'arraybuffer' }));

    const fileName = `rapport-chef-${journal.isoDate}.pdf`;
    const directory = Capacitor.getPlatform() === 'web' ? Directory.Data : Directory.Documents;
    const filePath = `${REPORT_DIR}/${fileName}`;
    await Filesystem.writeFile({
      path: filePath,
      data: toBase64(bytes),
      directory,
      recursive: true
    });

    if (options.open) {
      try {
        await this.exportLocation.openExportLocation({
          folderPath: REPORT_DIR,
          filePath,
          directory,
          fileName
        });
      } catch (openError) {
        console.warn('Ouverture du rapport du jour impossible:', openError);
      }
    }
  }

  private clientName(clientId: number): string | undefined {
    const pack = this.scope.getPack();
    const client = pack?.clients?.find(row => row.id === clientId);
    const fromClient = (client?.fullName || `${client?.firstname || ''} ${client?.lastname || ''}`).trim();
    if (fromClient) {
      return fromClient;
    }
    const credit = [...(pack?.lateCredits ?? []), ...(pack?.inProgressCredits ?? [])]
      .find(row => row.clientId === clientId);
    if (credit?.clientName) {
      return credit.clientName;
    }
    return pack?.tontineMembers?.find(row => row.clientId === clientId)?.clientName;
  }
}

function toRequestRow(row: RmDailyJournalOperation): {
  operationType: string;
  dossier: string;
  time: string;
  status: string;
  detail: string;
} {
  return {
    operationType: row.operationType,
    dossier: row.dossier,
    time: row.time,
    status: row.status,
    detail: row.detail
  };
}

function toBase64(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes);
  let binary = '';
  const chunk = 0x8000;
  for (let offset = 0; offset < view.length; offset += chunk) {
    binary += String.fromCharCode(...view.subarray(offset, offset + chunk));
  }
  return btoa(binary);
}

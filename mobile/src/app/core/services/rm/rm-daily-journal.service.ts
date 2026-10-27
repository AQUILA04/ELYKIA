import { Injectable } from '@angular/core';
import { AuthService } from '../auth.service';
import { PdfReportService } from '../pdf-report.service';
import { RmScopeService } from './rm-scope.service';
import { RmCloseQueueService } from './rm-close-queue.service';
import { RmContactQueueService } from './rm-contact-queue.service';
import { RmFieldControlQueueService } from './rm-field-control-queue.service';
import { RmTontineFieldControlQueueService } from './rm-tontine-field-control-queue.service';
import { RmCarnetVerificationQueueService } from './rm-carnet-verification-queue.service';
import { RmCreditCarnetVerificationQueueService } from './rm-credit-carnet-verification-queue.service';
import { RmCollectorAssignQueueService } from './rm-collector-assign-queue.service';
import { buildRmDailyJournal, buildRmDailyJournalHtml } from './rm-daily-journal.util';

@Injectable({ providedIn: 'root' })
export class RmDailyJournalService {
  constructor(
    private readonly pdfReport: PdfReportService,
    private readonly auth: AuthService,
    private readonly scope: RmScopeService,
    private readonly closeQueue: RmCloseQueueService,
    private readonly contactQueue: RmContactQueueService,
    private readonly fieldControlQueue: RmFieldControlQueueService,
    private readonly tontineFieldControlQueue: RmTontineFieldControlQueueService,
    private readonly carnetQueue: RmCarnetVerificationQueueService,
    private readonly creditCarnetQueue: RmCreditCarnetVerificationQueueService,
    private readonly assignQueue: RmCollectorAssignQueueService
  ) {}

  /**
   * Même enregistrement que le rapport journalier commercial :
   * HTML local, PDF, puis fichier dans elykia/rapport.
   */
  async saveToday(): Promise<string> {
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
    const filename = this.pdfReport.generateFilename(now);
    const pdfBase64 = await this.pdfReport.generatePDF(
      buildRmDailyJournalHtml(journal, this.auth.currentUser?.username || 'Chef de recouvrement'),
      filename
    );
    await this.pdfReport.savePDFToExternalStorage(pdfBase64, filename);
    return filename;
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

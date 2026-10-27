import { RmCloseOp } from './rm-close.models';
import { RmFieldControlOp } from './rm-field-control.models';
import { RmContactPatch } from './rm-contact.models';
import { RmCollectorAssignOp } from './rm-collector-assign.models';
import { buildRmDailyJournal, buildRmDailyJournalHtml, RmDailyJournalSources } from './rm-daily-journal.util';

const now = new Date(2026, 9, 27, 18, 0, 0);
const today = new Date(2026, 9, 27, 9, 15, 0).toISOString();
const yesterday = new Date(2026, 9, 26, 21, 0, 0).toISOString();

function sources(partial: Partial<RmDailyJournalSources> = {}): RmDailyJournalSources {
  return {
    closes: [],
    creditControls: [],
    tontineControls: [],
    creditCarnets: [],
    tontineCarnets: [],
    contacts: [],
    assigns: [],
    ...partial
  };
}

describe('buildRmDailyJournal', () => {
  it('ne retient que les opérations du jour calendaire local et classe leur statut', () => {
    const control: RmFieldControlOp = {
      localId: 'c1',
      reference: 'CF-1',
      creditId: 4,
      notebookTotalAmount: 100,
      systemTotalAmountPaid: 80,
      differenceAmount: 20,
      status: 'ECART',
      clientName: 'Ama Koffi',
      observedAt: today,
      createdAt: today,
      isSync: false,
      lastError: 'Réseau indisponible'
    };
    const oldClose: RmCloseOp = {
      localId: 'k1',
      reference: 'CL-1',
      creditId: 4,
      amount: 1000,
      isPartial: false,
      clientName: 'Ama Koffi',
      createdAt: yesterday,
      isSync: true
    };
    const syncedClose: RmCloseOp = {
      localId: 'k2',
      reference: 'CL-2',
      creditId: 5,
      amount: 2500,
      isPartial: true,
      clientName: 'Jean Mensah',
      createdAt: new Date(2026, 9, 27, 11, 0, 0).toISOString(),
      isSync: true,
      lastError: null
    };

    const journal = buildRmDailyJournal(sources({
      creditControls: [control],
      closes: [oldClose, syncedClose]
    }), () => undefined, now);

    expect(journal.isoDate).toBe('2026-10-27');
    expect(journal.operations.map(row => row.dossier)).toEqual(['Ama Koffi', 'Jean Mensah']);
    expect(journal.operations[0].status).toBe('Échec');
    expect(journal.operations[0].operationType).toBe('Contrôle crédit');
    expect(journal.operations[0].detail).toContain('Réseau indisponible');
    expect(journal.operations[1].status).toBe('Synchronisé');
    expect(journal.operations[1].detail).toContain('Partiel');
  });

  it('détaille un contact nommé et un transfert par client', () => {
    const contact: RmContactPatch = {
      localId: 'p1',
      reference: 'CT-1',
      clientId: 12,
      phone: '90112233',
      createdAt: today,
      isSync: false
    };
    const assign: RmCollectorAssignOp = {
      localId: 'a1',
      clientIds: [12, 13],
      collector: 'COM012',
      createdAt: new Date(2026, 9, 27, 16, 40, 0).toISOString(),
      isSync: false,
      transferInProgressCredits: true
    };

    const journal = buildRmDailyJournal(sources({
      contacts: [contact],
      assigns: [assign]
    }), id => id === 12 ? 'Ama Koffi' : undefined, now);

    expect(journal.operations.map(row => row.status)).toEqual(['Local', 'Local', 'Local']);
    expect(journal.operations[0]).toEqual(jasmine.objectContaining({
      operationType: 'Contact',
      dossier: 'Ama Koffi',
      detail: '90112233'
    }));
    expect(journal.operations.map(row => row.dossier)).toEqual(['Ama Koffi', 'Ama Koffi', 'Client 13']);
    expect(journal.operations[2].detail).toBe('Crédit COM012');
  });

  it('prépare un document autonome qui contient le statut sans rien demander au réseau', () => {
    const journal = buildRmDailyJournal(sources({
      creditControls: [{
        localId: 'c1',
        reference: 'CF-1',
        creditId: 4,
        notebookTotalAmount: 100,
        systemTotalAmountPaid: 80,
        differenceAmount: 20,
        status: 'ECART',
        clientName: 'Ama <Koffi>',
        observedAt: today,
        createdAt: today,
        isSync: false,
        lastError: 'Réseau indisponible'
      }]
    }), () => undefined, now);

    const html = buildRmDailyJournalHtml(journal, 'RM01');
    expect(html).toContain('Rapport journalier');
    expect(html).toContain('Échec');
    expect(html).toContain('Ama &lt;Koffi&gt;');
    expect(html).toContain('RM01');
    expect(html).not.toContain('http');
  });
});
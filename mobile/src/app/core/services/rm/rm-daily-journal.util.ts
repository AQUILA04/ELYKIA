import { RmCarnetVerificationOp } from './rm-carnet-verification.models';
import { RmCloseOp } from './rm-close.models';
import { RmCollectorAssignOp } from './rm-collector-assign.models';
import { RmContactPatch } from './rm-contact.models';
import { RmCreditCarnetVerificationOp } from './rm-credit-carnet-verification.models';
import { RmFieldControlOp } from './rm-field-control.models';
import { RmTontineFieldControlOp } from './rm-tontine-field-control.models';

export const RM_JOURNAL_STATUS = {
  synced: 'Synchronisé',
  local: 'Local',
  failed: 'Échec'
} as const;

export type RmJournalStatus = typeof RM_JOURNAL_STATUS[keyof typeof RM_JOURNAL_STATUS];

export interface RmDailyJournalOperation {
  operationType: string;
  dossier: string;
  time: string;
  status: RmJournalStatus;
  detail: string;
  createdAt: string;
}

export interface RmDailyJournal {
  isoDate: string;
  journalDate: string;
  operations: RmDailyJournalOperation[];
}

export interface RmDailyJournalSources {
  closes: RmCloseOp[];
  creditControls: RmFieldControlOp[];
  tontineControls: RmTontineFieldControlOp[];
  creditCarnets: RmCreditCarnetVerificationOp[];
  tontineCarnets: RmCarnetVerificationOp[];
  contacts: RmContactPatch[];
  assigns: RmCollectorAssignOp[];
}

type NamedOp = {
  createdAt?: string;
  isSync: boolean;
  lastError?: string | null;
};

/** Jour calendaire de l'appareil, pas le jour UTC. */
export function localIsoDate(now: Date): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function localDisplayDate(now: Date): string {
  return now.toLocaleDateString('fr-FR');
}

export function journalStatus(op: NamedOp): RmJournalStatus {
  if (op.lastError && op.lastError.trim()) {
    return RM_JOURNAL_STATUS.failed;
  }
  if (op.isSync) {
    return RM_JOURNAL_STATUS.synced;
  }
  return RM_JOURNAL_STATUS.local;
}

function sameLocalDay(iso: string | undefined, now: Date): boolean {
  if (!iso) {
    return false;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function money(amount: number): string {
  return `${new Intl.NumberFormat('fr-FR').format(Math.round(amount || 0))} FCFA`;
}

function withError(detail: string, op: NamedOp): string {
  if (op.lastError && op.lastError.trim()) {
    return detail ? `${detail} — ${op.lastError.trim()}` : op.lastError.trim();
  }
  return detail;
}

function push(
  rows: RmDailyJournalOperation[],
  now: Date,
  op: NamedOp,
  operationType: string,
  dossier: string,
  detail: string
): void {
  if (!op.createdAt || !sameLocalDay(op.createdAt, now)) {
    return;
  }
  rows.push({
    operationType,
    dossier: dossier || '—',
    time: clock(op.createdAt),
    status: journalStatus(op),
    detail: withError(detail, op),
    createdAt: op.createdAt
  });
}

export function buildRmDailyJournal(
  sources: RmDailyJournalSources,
  clientName: (clientId: number) => string | undefined,
  now: Date
): RmDailyJournal {
  const rows: RmDailyJournalOperation[] = [];

  for (const op of sources.creditControls) {
    const ecart = op.status === 'ECART' ? ` · écart ${money(op.differenceAmount)}` : '';
    push(
      rows,
      now,
      op,
      'Contrôle crédit',
      op.clientName || op.creditReference || `Crédit ${op.creditId}`,
      `${op.status}${ecart}`
    );
  }
  for (const op of sources.tontineControls) {
    const ecart = op.status === 'ECART' ? ` · écart ${money(op.differenceAmount)}` : '';
    push(
      rows,
      now,
      op,
      'Contrôle tontine',
      op.clientName || `Membre ${op.tontineMemberId}`,
      `${op.status}${ecart}`
    );
  }
  for (const op of sources.creditCarnets) {
    push(
      rows,
      now,
      op,
      'Vérification carnet crédit',
      op.clientName || op.reference || `Crédit ${op.creditId}`,
      op.verified ? 'Carnet vérifié' : 'Vérification annulée'
    );
  }
  for (const op of sources.tontineCarnets) {
    push(
      rows,
      now,
      op,
      'Vérification carnet tontine',
      op.clientName || `Membre ${op.tontineMemberId}`,
      op.verified ? 'Carnet vérifié' : 'Vérification annulée'
    );
  }
  for (const op of sources.closes) {
    push(
      rows,
      now,
      op,
      'Clôture',
      op.clientName || op.creditReference || `Crédit ${op.creditId}`,
      `${op.isPartial ? 'Partiel' : 'Total'} · ${money(op.amount)}`
    );
  }
  for (const op of sources.contacts) {
    const bits: string[] = [];
    if (op.phone) {
      bits.push(op.phone);
    }
    if (op.latitude != null && op.longitude != null) {
      bits.push('Position');
    }
    push(
      rows,
      now,
      op,
      'Contact',
      clientName(op.clientId) || `Client ${op.clientId}`,
      bits.join(' · ')
    );
  }
  for (const op of sources.assigns) {
    const bits: string[] = [];
    if (op.collector) {
      bits.push(`Crédit ${op.collector}`);
    }
    if (op.tontineCollector) {
      bits.push(`Tontine ${op.tontineCollector}`);
    }
    const ids = op.clientIds?.length ? op.clientIds : [0];
    for (const clientId of ids) {
      push(
        rows,
        now,
        op,
        'Transfert de commercial',
        clientId ? (clientName(clientId) || `Client ${clientId}`) : '—',
        bits.join(' · ')
      );
    }
  }

  rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return {
    isoDate: localIsoDate(now),
    journalDate: localDisplayDate(now),
    operations: rows
  };
}

/** Même mise en page que le rapport journalier commercial : HTML local, puis PDF sur le téléphone. */
export function buildRmDailyJournalHtml(journal: RmDailyJournal, operatorLabel: string): string {
  const formattedDate = journal.journalDate;
  const synced = journal.operations.filter(row => row.status === RM_JOURNAL_STATUS.synced).length;
  const local = journal.operations.filter(row => row.status === RM_JOURNAL_STATUS.local).length;
  const failed = journal.operations.filter(row => row.status === RM_JOURNAL_STATUS.failed).length;
  const types = [...new Set(journal.operations.map(row => row.operationType))];
  const tables = types.length === 0
    ? journalTable('Opérations', [])
    : types.map(type => journalTable(type, journal.operations.filter(row => row.operationType === type))).join('');

  return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <title>Rapport Journalier - ${escapeHtml(formattedDate)}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 800px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #003366; }
          .header h1 { margin: 0; font-size: 24pt; color: #003366; text-transform: uppercase; }
          .header p { margin: 5px 0; font-size: 11pt; color: #666; }
          .kpi-section { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
          .kpi-section h2 { margin: 0 0 15px 0; font-size: 14pt; color: #003366; text-transform: uppercase; }
          .kpi-item { padding: 8px 0; border-bottom: 1px solid #ddd; }
          .kpi-label { font-weight: bold; color: #555; }
          .kpi-value { color: #003366; font-weight: bold; }
          .table-section { margin-bottom: 30px; }
          .table-section h3 { margin: 0 0 10px 0; font-size: 12pt; color: #003366; text-transform: uppercase; border-bottom: 2px solid #003366; padding-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
          th { background: #003366; color: white; padding: 8px; text-align: left; font-size: 9pt; font-weight: bold; }
          td { padding: 6px 8px; border-bottom: 1px solid #ddd; font-size: 9pt; }
          tr:nth-child(even) { background: #f9f9f9; }
          .status-local { color: #757575; font-weight: bold; }
          .status-sync { color: #4CAF50; font-weight: bold; }
          .status-failed { color: #c75000; font-weight: bold; }
          .empty-message { text-align: center; color: #999; font-style: italic; padding: 20px; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 9pt; color: #999; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Rapport Journalier</h1>
            <p><strong>Date:</strong> ${escapeHtml(formattedDate)}</p>
            <p><strong>Chef de recouvrement:</strong> ${escapeHtml(operatorLabel || 'Chef de recouvrement')}</p>
          </div>
          <div class="kpi-section">
            <h2>Résumé du Jour</h2>
            <div class="kpi-item"><span class="kpi-label">Opérations:</span> <span class="kpi-value">${journal.operations.length}</span></div>
            <div class="kpi-item"><span class="kpi-label">Sync:</span> <span class="kpi-value">${synced}</span></div>
            <div class="kpi-item"><span class="kpi-label">Local:</span> <span class="kpi-value">${local}</span></div>
            <div class="kpi-item"><span class="kpi-label">Échec:</span> <span class="kpi-value">${failed}</span></div>
          </div>
          ${tables}
          <div class="footer">
            <p>Document généré le ${escapeHtml(new Date().toLocaleString('fr-FR'))}</p>
            <p>© ELYKIA - Tous droits réservés</p>
          </div>
        </div>
      </body>
      </html>
    `;
}

function journalTable(title: string, rows: RmDailyJournalOperation[]): string {
  if (rows.length === 0) {
    return `
        <div class="table-section">
          <h3>${escapeHtml(title)}</h3>
          <div class="empty-message">Aucune donnée disponible</div>
        </div>
      `;
  }
  const dataRows = rows.map((row, index) => {
    const label = pdfStatusLabel(row.status);
    const cssClass = label === 'Sync' ? 'status-sync' : label === 'Échec' ? 'status-failed' : 'status-local';
    return `<tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(row.time)}</td>
      <td>${escapeHtml(row.dossier)}</td>
      <td>${escapeHtml(row.detail)}</td>
      <td class="${cssClass}">${escapeHtml(label)}</td>
    </tr>`;
  }).join('');
  return `
      <div class="table-section">
        <h3>${escapeHtml(title)}</h3>
        <table>
          <thead>
            <tr><th>ID</th><th>Heure</th><th>Dossier</th><th>Détails</th><th>Statut</th></tr>
          </thead>
          <tbody>${dataRows}</tbody>
        </table>
      </div>
    `;
}

function pdfStatusLabel(status: RmJournalStatus): string {
  if (status === RM_JOURNAL_STATUS.synced) {
    return 'Sync';
  }
  if (status === RM_JOURNAL_STATUS.failed) {
    return 'Échec';
  }
  return 'Local';
}

function escapeHtml(value: string): string {
  return (value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

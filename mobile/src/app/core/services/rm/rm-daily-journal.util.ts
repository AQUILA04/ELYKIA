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

/** Document autonome : le fichier est produit sur le téléphone, sans appel réseau. */
export function buildRmDailyJournalHtml(journal: RmDailyJournal, operatorLabel: string): string {
  const synced = journal.operations.filter(row => row.status === RM_JOURNAL_STATUS.synced).length;
  const local = journal.operations.filter(row => row.status === RM_JOURNAL_STATUS.local).length;
  const failed = journal.operations.filter(row => row.status === RM_JOURNAL_STATUS.failed).length;
  const body = journal.operations.length === 0
    ? '<p class="empty">Aucune opération enregistrée pour cette journée.</p>'
    : `<table class="ops">
        <thead>
          <tr><th>#</th><th>Heure</th><th>Opération</th><th>Dossier</th><th>Statut</th><th>Détail</th></tr>
        </thead>
        <tbody>
          ${journal.operations.map((row, index) => `<tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(row.time)}</td>
            <td>${escapeHtml(row.operationType)}</td>
            <td>${escapeHtml(row.dossier)}</td>
            <td>${escapeHtml(row.status)}</td>
            <td>${escapeHtml(row.detail)}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/>
<style>
  body { font-family: Helvetica, Arial, sans-serif; color: #1a2a44; font-size: 12px; }
  .brand { background: #003366; color: #fff; padding: 14px 16px; }
  h1 { margin: 0 0 4px; font-size: 18px; }
  .brand p { margin: 0; font-size: 11px; }
  .meta, .kpi { width: 100%; border-collapse: collapse; margin-top: 12px; }
  .meta td, .kpi td { border: 1px solid #dde3ec; padding: 8px; vertical-align: top; }
  .label { display: block; font-size: 9px; color: #6b7a99; text-transform: uppercase; }
  .kpi strong { font-size: 16px; color: #003366; }
  table.ops { width: 100%; border-collapse: collapse; margin-top: 12px; }
  table.ops th { background: #003366; color: #fff; text-align: left; padding: 6px; font-size: 10px; }
  table.ops td { border: 1px solid #dde3ec; padding: 6px; }
  .empty { margin-top: 16px; }
</style></head>
<body>
  <div class="brand">
    <h1>AMENOUVEVE-YAVEH</h1>
    <p>TOKOIN HÔPITAL · 96 18 68 22</p>
    <p>Rapport journalier</p>
  </div>
  <table class="meta">
    <tr>
      <td><span class="label">Journée</span>${escapeHtml(journal.journalDate)}</td>
      <td><span class="label">Chef de recouvrement</span>${escapeHtml(operatorLabel || 'Chef de recouvrement')}</td>
    </tr>
  </table>
  <table class="kpi">
    <tr>
      <td><span class="label">Opérations</span><strong>${journal.operations.length}</strong></td>
      <td><span class="label">Synchronisées</span><strong>${synced}</strong></td>
      <td><span class="label">En local</span><strong>${local}</strong></td>
      <td><span class="label">Échecs</span><strong>${failed}</strong></td>
    </tr>
  </table>
  ${body}
</body></html>`;
}

function escapeHtml(value: string): string {
  return (value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

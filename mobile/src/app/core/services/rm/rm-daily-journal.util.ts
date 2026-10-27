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

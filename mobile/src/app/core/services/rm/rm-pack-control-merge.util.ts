import { RmFieldControlOp } from './rm-field-control.models';
import { RmTontineFieldControlOp } from './rm-tontine-field-control.models';
import { RmOfflinePack, RmPackTontineFieldControlToday } from './rm.models';

/**
 * Le pack serveur porte le dernier contrôle déjà enregistré de chaque dossier.
 * Les contrôles encore dans la file locale sont plus récents : ils remplacent
 * ce dernier contrôle pour que les cartes restent à jour avant la synchronisation.
 */
export function mergePendingControlsIntoPack(
  pack: RmOfflinePack,
  creditOps: RmFieldControlOp[],
  tontineOps: RmTontineFieldControlOp[]
): RmOfflinePack {
  return {
    ...pack,
    creditFieldControlsToday: mergeCreditControls(pack.creditFieldControlsToday, creditOps),
    tontineFieldControlsToday: mergeTontineControls(pack.tontineFieldControlsToday, tontineOps)
  };
}

function mergeCreditControls(current: unknown[] | undefined, ops: RmFieldControlOp[]): unknown[] {
  const controls = Array.isArray(current) ? [...current] : [];
  for (const op of ops) {
    if (!op || op.isSync || op.creditId == null) {
      continue;
    }
    const entry = {
      creditId: op.creditId,
      reference: op.reference,
      notebookTotalAmount: op.notebookTotalAmount,
      systemTotalAmountPaid: op.systemTotalAmountPaid,
      differenceAmount: op.differenceAmount,
      status: op.status,
      note: op.note,
      observedAt: op.observedAt,
      ecartDecisionStatus: op.status === 'ECART' ? 'PENDING' : null,
      modifiable: op.status === 'ECART'
    };
    const idx = controls.findIndex(control => matchesCredit(control, op));
    if (idx >= 0) {
      controls[idx] = entry;
    } else {
      controls.unshift(entry);
    }
  }
  return controls;
}

function mergeTontineControls(
  current: RmPackTontineFieldControlToday[] | undefined,
  ops: RmTontineFieldControlOp[]
): RmPackTontineFieldControlToday[] {
  const controls = Array.isArray(current) ? [...current] : [];
  for (const op of ops) {
    if (!op || op.isSync || op.tontineMemberId == null) {
      continue;
    }
    const entry: RmPackTontineFieldControlToday = {
      tontineMemberId: op.tontineMemberId,
      reference: op.reference,
      notebookTotalAmount: op.notebookTotalAmount,
      systemTotalAmount: op.systemTotalAmount,
      differenceAmount: op.differenceAmount,
      status: op.status,
      note: op.note,
      observedAt: op.observedAt,
      ecartDecisionStatus: op.status === 'ECART' ? 'PENDING' : null,
      modifiable: op.status === 'ECART'
    };
    const idx = controls.findIndex(
      control => control?.tontineMemberId === op.tontineMemberId || control?.reference === op.reference
    );
    if (idx >= 0) {
      controls[idx] = entry;
    } else {
      controls.unshift(entry);
    }
  }
  return controls;
}

function matchesCredit(control: unknown, op: RmFieldControlOp): boolean {
  if (!control || typeof control !== 'object') {
    return false;
  }
  const row = control as { creditId?: number; reference?: string };
  return Number(row.creditId) === op.creditId || row.reference === op.reference;
}

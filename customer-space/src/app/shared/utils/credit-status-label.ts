/** Libellés métier des statuts crédit / commande exposés à l'Espace Client. */
export function creditStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'INPROGRESS':
      return 'EN COURS';
    case 'LIVRE':
      return 'TERMINÉ';
    case 'VALIDE':
      return 'VALIDÉ';
    case 'INITIE':
      return 'INITIÉ';
    case 'RETARD':
      return 'RETARD';
    default:
      return status || '';
  }
}

export function creditStatusChipClass(status: string | null | undefined): string {
  if (status === 'LIVRE') return 'elyk-chip--success';
  if (status === 'INPROGRESS') return 'elyk-chip--gold';
  if (status === 'VALIDE') return 'elyk-chip--success';
  if (status === 'RETARD') return 'elyk-chip--neutral';
  return 'elyk-chip--gold';
}

export enum WriteErrorKind {
  NETWORK = 'NETWORK',
  BUSINESS = 'BUSINESS'
}

export class OnlineWriteError extends Error {
  readonly kind: WriteErrorKind;
  /** Statut HTTP renvoyé par le serveur, quand il y en a un. */
  readonly status?: number;

  constructor(kind: WriteErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'OnlineWriteError';
    this.kind = kind;
    this.status = status;
  }

  /**
   * 409 : le serveur a déjà la saisie (doublon tontine saisi depuis un autre téléphone).
   * Enregistrer hors ligne ne ferait que repousser le même refus à la synchronisation.
   */
  get isServerConflict(): boolean {
    return this.status === 409;
  }
}

export type WritePersistenceMode = 'online' | 'offline';

export interface OnlineFirstWriteResult<T> {
  data: T;
  mode: WritePersistenceMode;
}

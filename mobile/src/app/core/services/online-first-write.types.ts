export enum WriteErrorKind {
  NETWORK = 'NETWORK',
  BUSINESS = 'BUSINESS'
}

export class OnlineWriteError extends Error {
  readonly kind: WriteErrorKind;

  constructor(kind: WriteErrorKind, message: string) {
    super(message);
    this.name = 'OnlineWriteError';
    this.kind = kind;
  }
}

export type WritePersistenceMode = 'online' | 'offline';

export interface OnlineFirstWriteResult<T> {
  data: T;
  mode: WritePersistenceMode;
}

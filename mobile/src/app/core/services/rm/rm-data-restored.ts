type RmDataRestoredListener = () => void | Promise<void>;

const listeners: RmDataRestoredListener[] = [];

/** Les files et le pack se réinscrivent pour recharger SQLite après une restauration. */
export function onRmDataRestored(listener: RmDataRestoredListener): void {
  listeners.push(listener);
}

export async function notifyRmDataRestored(): Promise<void> {
  for (const listener of listeners) {
    await listener();
  }
}

export function resetRmDataRestoredListeners(): void {
  listeners.length = 0;
}

import { AlertController } from '@ionic/angular';

/**
 * Confirms a carnet verify / cancel action with the standard RM alert.
 * Returns true when the user confirms.
 */
export async function confirmCarnetVerificationToggle(
  alertCtrl: AlertController,
  nextVerified: boolean,
  subjectLabel: string
): Promise<boolean> {
  const alert = await alertCtrl.create({
    header: nextVerified ? 'Vérifier le carnet' : 'Annuler la vérification',
    message: nextVerified
      ? `Marquer le carnet de ${subjectLabel} comme vérifié ?`
      : `Retirer la vérification de ${subjectLabel} ?`,
    buttons: [
      { text: 'Non', role: 'cancel' },
      { text: nextVerified ? 'Vérifier' : 'Annuler', role: 'confirm' }
    ]
  });
  await alert.present();
  const { role } = await alert.onDidDismiss();
  return role === 'confirm';
}

/**
 * Runs a carnet toggle after confirmation; callers supply busy flag hooks and toasts.
 */
export async function runConfirmedCarnetToggle(opts: {
  alertCtrl: AlertController;
  nextVerified: boolean;
  subjectLabel: string;
  isBusy: () => boolean;
  setBusy: (busy: boolean) => void;
  execute: () => Promise<void>;
  onSuccess: (nextVerified: boolean) => Promise<void>;
  onError: (message: string) => Promise<void>;
}): Promise<void> {
  if (opts.isBusy()) {
    return;
  }
  const confirmed = await confirmCarnetVerificationToggle(
    opts.alertCtrl,
    opts.nextVerified,
    opts.subjectLabel
  );
  if (!confirmed) {
    return;
  }
  opts.setBusy(true);
  try {
    await opts.execute();
    await opts.onSuccess(opts.nextVerified);
  } catch (error: any) {
    await opts.onError(error?.message || 'Échec de la vérification');
  } finally {
    opts.setBusy(false);
  }
}

import { AlertController } from '@ionic/angular';

export interface SocietyShareInput {
  amount: number;
  comment: string | null;
}

/**
 * Demande la part société réelle de l'année. Le commercial ne voit pas la valeur calculée :
 * il saisit le montant du carnet, le serveur valide s'il est conforme, sinon le retient.
 * @param maxAmount total cotisé hors collectes de livraison (la part ne peut pas le dépasser)
 */
export async function promptSocietyShare(
  alertCtrl: AlertController,
  maxAmount: number,
  message = 'Saisissez la part société que ce membre doit sur toute l\'année.'
): Promise<SocietyShareInput | null> {
  return new Promise<SocietyShareInput | null>(resolve => {
    let settled = false;
    const finish = (value: SocietyShareInput | null) => {
      if (!settled) {
        settled = true;
        resolve(value);
      }
    };
    void alertCtrl.create({
      header: 'Réajuster la part société',
      message,
      cssClass: 'elyk-alert',
      inputs: [
        {
          name: 'amount',
          type: 'number',
          min: 0,
          placeholder: 'Part société de l\'année (FCFA)',
          attributes: { inputmode: 'numeric', 'data-testid': 'e2e-tontine-society-share-input' }
        },
        {
          name: 'comment',
          type: 'textarea',
          placeholder: 'Commentaire (facultatif)'
        }
      ],
      buttons: [
        { text: 'Annuler', role: 'cancel', handler: () => finish(null) },
        {
          text: 'Enregistrer',
          handler: (data: { amount?: string | number; comment?: string }) => {
            const amount = Number(data?.amount);
            if (data?.amount === '' || data?.amount === undefined || !Number.isFinite(amount) || amount < 0) {
              return false;
            }
            if (amount > maxAmount + 1) {
              return false;
            }
            finish({ amount: Math.round(amount), comment: (data?.comment || '').trim() || null });
            return true;
          }
        }
      ]
    }).then(alert => {
      void alert.onDidDismiss().then(() => finish(null));
      return alert.present();
    });
  });
}

/** Total cotisé hors collectes de livraison (base de la part société). */
export function regularContributionOf(collections: Array<{ amount?: number; isDeliveryCollection?: boolean }>): number {
  return collections
    .filter(collection => !collection.isDeliveryCollection)
    .reduce((sum, collection) => sum + (collection.amount || 0), 0);
}
